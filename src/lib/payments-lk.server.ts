import "server-only";

import { PaymentsLk, type Payment, type WebhookEvent, type WebhookTestPing } from "@payments-lk/node";
import { revalidateCatalogCache } from "@/lib/cache-invalidation.server";
import { notifyAdminRefundNeeded, notifyOrderPlaced } from "@/lib/email/notifications.server";
import { deductStock, restoreStock, type StockItem } from "@/lib/stock-helpers.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";

export const PAYMENTS_LK_DESC_LIMIT = 120;

/**
 * Builds a clean checkout description within Payments.lk's 120-character limit.
 */
export function buildCheckoutDescription(
  lines: Array<{ product_name: string; quantity: number }>,
): string {
  const names = lines.map((l) =>
    l.quantity > 1 ? `${l.product_name} ×${l.quantity}` : l.product_name,
  );
  const full = names.join(", ");
  if (full.length <= PAYMENTS_LK_DESC_LIMIT) return full;

  let result = "";
  let included = 0;
  for (const name of names) {
    const remaining = names.length - included;
    const suffix = remaining > 1 ? ` +${remaining - 1} more` : "";
    const candidate = included === 0 ? name : `${result}, ${name}`;
    if (candidate.length + suffix.length > PAYMENTS_LK_DESC_LIMIT) break;
    result = candidate;
    included++;
  }

  if (included === 0) {
    const firstName = names[0] ?? "Order";
    const suffix = names.length > 1 ? ` +${names.length - 1} more` : "";
    const maxLen = PAYMENTS_LK_DESC_LIMIT - suffix.length - 3;
    return firstName.slice(0, Math.max(1, maxLen)) + "..." + suffix;
  }

  const leftover = names.length - included;
  if (leftover > 0) result += ` +${leftover} more`;
  return result.slice(0, PAYMENTS_LK_DESC_LIMIT);
}

/**
 * Helper to construct the PaymentsLk client.
 */
export function getPaymentsLkClient(): PaymentsLk {
  const secretKey = process.env.PAYMENTS_LK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("PAYMENTS_LK_SECRET_KEY is not configured.");
  }
  return new PaymentsLk(secretKey);
}

/**
 * Helper to get the canonical site origin.
 */
export function getSiteOrigin(request?: Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  if (request) {
    try {
      const url = new URL(request.url);
      return url.origin;
    } catch {
      // fallback
    }
  }
  return "https://almera.lk";
}

export type OrderItemLike = {
  variant_id?: string | null;
  product_id?: string | null;
  quantity: number | string;
  product_slug: string;
};

/**
 * Helper to convert order_items into StockItem[] for deduct/restore operations.
 */
export function mapOrderItemsToStockTargets(orderItems: OrderItemLike[]): StockItem[] {
  return (orderItems ?? [])
    .map((item: OrderItemLike) =>
      item.variant_id
        ? {
            id: item.variant_id,
            quantity: Number(item.quantity),
            table: "product_variants" as const,
            slug: item.product_slug,
          }
        : item.product_id
          ? {
              id: item.product_id,
              quantity: Number(item.quantity),
              table: "products" as const,
              slug: item.product_slug,
            }
          : null,
    )
    .filter((x: StockItem | null): x is StockItem => x !== null);
}

/**
 * Step 4.3: Fast-Release on Cancel (GET /api/cancel-card-checkout)
 * Restores held stock immediately and returns a redirect response to checkout.
 */
export async function handleCancelCardCheckout(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id");
  const origin = getSiteOrigin(request);

  if (orderId) {
    const supabase = getSupabaseAdmin();
    const { data: order } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", orderId)
      .maybeSingle();

    if (order && order.status === "payment_pending" && order.stock_reserved) {
      const stockItems = mapOrderItemsToStockTargets(order.order_items);
      try {
        if (stockItems.length > 0) {
          await restoreStock(stockItems);
          revalidateCatalogCache(stockItems.map((s) => s.slug));
        }

        if (order.coupon_code) {
          try {
            await supabase.rpc("decrement_coupon_usage", { p_code: order.coupon_code });
          } catch {
            // non-blocking
          }
        }

        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            stock_reserved: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        console.log(`[stock-hold] Released stock for cancelled checkout order ${order.order_number || orderId}`);
      } catch (err) {
        console.error(`[stock-hold] Error restoring stock for cancelled order ${orderId}:`, err);
      }
    }
  }

  // Redirect back to checkout with payment_cancelled=true (cart remains intact)
  return Response.redirect(`${origin}/checkout?payment_cancelled=true`);
}

/**
 * Step 4.4: 15-Minute Expiration Sweeper (Cron Job / Scheduled Task)
 * Runs periodically to release inventory for orders abandoned past their 15-minute hold.
 */
export async function sweepExpiredStockHolds(): Promise<{
  sweptCount: number;
  orderNumbers: string[];
}> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  // Find all unpaid orders past their 15-minute hold where stock is still marked reserved
  const { data: expiredOrders, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("status", "payment_pending")
    .is("payment_id", null)
    .eq("stock_reserved", true)
    .lte("hold_expires_at", now)
    .limit(50);

  if (error || !expiredOrders) {
    console.error("[stock-hold] Failed to fetch expired stock holds:", error);
    return { sweptCount: 0, orderNumbers: [] };
  }

  const sweptOrderNumbers: string[] = [];

  for (const order of expiredOrders) {
    try {
      const stockItems = mapOrderItemsToStockTargets(order.order_items);
      if (stockItems.length > 0) {
        await restoreStock(stockItems);
        revalidateCatalogCache(stockItems.map((s) => s.slug));
      }

      if (order.coupon_code) {
        try {
          await supabase.rpc("decrement_coupon_usage", { p_code: order.coupon_code });
        } catch {
          // non-blocking
        }
      }

      await supabase
        .from("orders")
        .update({
          status: "cancelled",
          stock_reserved: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      sweptOrderNumbers.push(order.order_number || order.id);
      console.log(`[stock-hold] Released reserved stock for expired order #${order.order_number || order.id}`);
    } catch (e) {
      console.error(`[stock-hold] Error releasing stock for order #${order.id}:`, e);
    }
  }

  return { sweptCount: sweptOrderNumbers.length, orderNumbers: sweptOrderNumbers };
}

/**
 * Step 4.5: Webhook Handler (POST /api/payments-lk-webhook)
 * Processes asynchronous payment confirmations from Payments.lk.
 */
export async function handlePaymentsLkWebhook(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const signature = request.headers.get("payments-signature") ?? "";
  const secretKey = process.env.PAYMENTS_LK_SECRET_KEY;
  const webhookSecret = process.env.PAYMENTS_LK_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    console.error("[payments-lk-webhook] Missing secret key or webhook secret in environment.");
    return new Response("Webhook not configured", { status: 500 });
  }

  const lk = new PaymentsLk(secretKey);
  let event: WebhookEvent | WebhookTestPing;
  try {
    event = lk.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.warn("[payments-lk-webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle test ping from Payments.lk dashboard
  if (event.type === "test.ping") {
    return new Response("OK", { status: 200 });
  }

  const supabase = getSupabaseAdmin();

  if (event.type === "payment.succeeded") {
    const payment = event.data as Payment;
    const rawRef = String(payment.reference ?? "").trim();
    const amountCents = Number(payment.amountCents);
    const paymentId = String(payment.id);

    // Look up order by reference (order_number like ALM-10001, numeric 10001, or UUID id)
    let query = supabase.from("orders").select("*, order_items(*)");
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRef)) {
      query = query.eq("id", rawRef);
    } else if (rawRef.startsWith("ALM-")) {
      query = query.eq("order_number", rawRef);
    } else if (/^\d+$/.test(rawRef)) {
      query = query.or(`order_number.eq.${rawRef},order_number.eq.ALM-${rawRef}`);
    } else {
      query = query.eq("order_number", rawRef);
    }

    const { data: order, error: orderErr } = await query.maybeSingle();

    if (orderErr || !order) {
      console.error(`[payments-lk-webhook] Order not found for reference: "${rawRef}"`);
      return new Response("Order not found", { status: 404 });
    }

    // Idempotency check: if this payment was already handled, return 200 OK immediately
    if (order.payment_id === paymentId) {
      return new Response("OK", { status: 200 });
    }

    // Validate amount (in cents)
    const expectedCents = Math.round(Number(order.total) * 100);
    if (amountCents !== expectedCents) {
      console.error(
        `[payments-lk-webhook] Amount mismatch for order ${order.order_number}: received ${amountCents} cents, expected ${expectedCents} cents`,
      );
      return new Response("Amount mismatch", { status: 400 });
    }

    const stockItems = mapOrderItemsToStockTargets(order.order_items);

    // CASE A: Standard happy path (order is payment_pending, stock was held upfront)
    if (order.status === "payment_pending") {
      await supabase
        .from("orders")
        .update({
          status: "pending",
          payment_id: paymentId,
          stock_reserved: false, // successfully finalized
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      try {
        await notifyOrderPlaced(order.id);
      } catch (e) {
        console.error(`[payments-lk-webhook] Email notification failed for order ${order.order_number}:`, e);
      }

      console.log(`[payments-lk-webhook] Order ${order.order_number} confirmed paid (payment_id: ${paymentId})`);
      return new Response("OK", { status: 200 });
    }

    // CASE B: Late payment (customer took >15 min, hold expired & stock was restored)
    if (order.status === "cancelled") {
      try {
        // Attempt to re-deduct stock
        await deductStock(stockItems);

        await supabase
          .from("orders")
          .update({
            status: "pending",
            payment_id: paymentId,
            stock_reserved: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        revalidateCatalogCache(stockItems.map((s) => s.slug));

        if (order.coupon_code) {
          try {
            await supabase.rpc("increment_coupon_usage", { p_code: order.coupon_code });
          } catch {
            // non-blocking
          }
        }

        try {
          await notifyOrderPlaced(order.id);
        } catch (e) {
          console.error(`[payments-lk-webhook] Late payment confirmation email failed for ${order.order_number}:`, e);
        }

        console.log(`[payments-lk-webhook] Late payment successfully reclaimed stock for order ${order.order_number}`);
      } catch (stockError) {
        // Stock was claimed by another customer during the hold lapse!
        console.error(
          `[payments-lk-webhook] Stock lapse failure for late order ${order.order_number}. Flagging processing_failed for admin refund:`,
          stockError,
        );

        await supabase
          .from("orders")
          .update({
            status: "processing_failed",
            payment_id: paymentId,
            stock_reserved: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        try {
          await notifyAdminRefundNeeded(
            order.id,
            paymentId,
            "Customer completed card payment after the 15-minute hold expired, and one or more items sold out before payment arrived.",
          );
        } catch (e) {
          console.error(`[payments-lk-webhook] Failed to notify admin for refund on order ${order.order_number}:`, e);
        }
      }

      return new Response("OK", { status: 200 });
    }
  }

  return new Response("OK", { status: 200 });
}
