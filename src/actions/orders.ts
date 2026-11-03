"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import {
  DISTRICTS,
  FREE_DELIVERY_FROM,
  SIZES,
  STITCHING_FEE,
  deliveryFee as deliveryFeeFor,
  nameWithColour,
} from "@/lib/catalog";
import { revalidateCatalogCache } from "@/lib/cache-invalidation.server";
import { requiresCodDeposit } from "@/lib/cod-deposit";
import { notifyOrderPlaced } from "@/lib/email/notifications.server";
import {
  COUPON_RATE_LIMIT,
  ORDER_RATE_LIMIT,
  enforceRateLimit,
  getClientIp,
} from "@/lib/rate-limit.server";
import { deductStock, restoreStock, type StockItem } from "@/lib/stock-helpers.server";
import {
  getPublicCoupons,
  validateAndCalculateCoupon,
  type PublicCouponSummary,
} from "@/lib/coupons.server";
import { getSupabaseAdmin } from "@/lib/supabase/admin.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildCheckoutDescription,
  getPaymentsLkClient,
  getSiteOrigin,
} from "@/lib/payments-lk.server";

const SL_PHONE_REGEX = /^(?:\+94|0)?7\d{8}$/;

export async function normalizeSlPhone(raw: string): Promise<string> {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+94/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}

const DISTRICTS_TUPLE = DISTRICTS as unknown as [string, ...string[]];

const orderItemInputSchema = z.object({
  slug: z.string().trim().min(1),
  stitching: z.enum(["unstitched", "stitched"]),
  size: z.string().trim().max(10).optional().nullable(),
  quantity: z.number().int().min(1).max(20),
});

const placeOrderSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  phone: z
    .string()
    .trim()
    .refine((v) => SL_PHONE_REGEX.test(v.replace(/[\s-]/g, "")), {
      message: "Enter a Sri Lankan mobile number, like 077 123 4567.",
    }),
  email: z.string().trim().email("Enter a valid email, or leave it blank.").max(120).optional().nullable().or(z.literal("")),
  address: z.string().trim().min(5, "Enter your house number and street.").max(300),
  city: z.string().trim().min(1, "Enter your city or town.").max(80),
  district: z.enum(DISTRICTS_TUPLE, { message: "Choose your district." }),
  postal_code: z.string().trim().max(20).optional().nullable(),
  note: z.string().trim().max(500).optional().nullable(),
  payment_method: z.enum(["cod", "bank", "card"]).default("cod"),
  coupon_code: z.string().trim().max(40).optional().nullable(),
  idempotency_key: z.string().optional(),
  items: z.array(orderItemInputSchema).min(1).max(50),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export type PlaceOrderResult = {
  order_number: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  status: string;
  payment_method: "cod" | "bank" | "card";
  checkout_url?: string;
};

export type CouponResult = {
  code: string;
  discountAmount: number;
  discountType: "percentage" | "fixed" | "free_delivery";
  discountValue?: number;
  isFreeDelivery?: boolean;
  firstOrderOnly?: boolean;
  maxDiscountAmount?: number | null;
  label: string;
};

export async function getPublicCouponsAction(): Promise<PublicCouponSummary[]> {
  return getPublicCoupons();
}

export async function validateCouponAction(input: {
  code: string;
  items: z.infer<typeof orderItemInputSchema>[];
  phone?: string;
  email?: string;
  requireCustomerForFirstOrder?: boolean;
}): Promise<CouponResult> {
  const reqHeaders = await headers();
  enforceRateLimit(getClientIp({ headers: reqHeaders }), COUPON_RATE_LIMIT);

  const normalizedCode = input.code.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error("Enter a promo code.");
  }

  let authenticatedUserId: string | null = null;
  try {
    const userClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user?.id) authenticatedUserId = user.id;
  } catch {
    // guest
  }

  const verified = await resolveAuthoritativeLines(input.items);
  const subtotal = verified.reduce((s, l) => s + l.unit_price * l.quantity, 0);
  const pieces = verified.reduce((n, l) => n + l.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_FROM ? 0 : deliveryFeeFor(pieces);

  const result = await validateAndCalculateCoupon({
    code: normalizedCode,
    items: verified.map((l) => ({
      product_id: l.product_id,
      slug: l.product_slug,
      price: l.unit_price,
      quantity: l.quantity,
      is_on_sale: l.is_on_sale,
      categories: l.categories,
      subcategory: l.subcategory,
    })),
    deliveryFee,
    customer: {
      phone: input.phone,
      email: input.email,
      user_id: authenticatedUserId,
    },
    requireCustomerForFirstOrder: input.requireCustomerForFirstOrder ?? false,
  });

  if (!result.valid) {
    throw new Error(result.message);
  }

  return {
    code: result.code,
    discountAmount: result.discount_amount,
    discountType: result.type,
    discountValue: result.discount_value,
    isFreeDelivery: result.is_free_delivery,
    firstOrderOnly: result.first_order_only,
    maxDiscountAmount: result.max_discount_amount,
    label: result.message,
  };
}

async function resolveAuthoritativeLines(items: z.infer<typeof orderItemInputSchema>[]) {
  const supabase = getSupabaseAdmin();
  const slugs = [...new Set(items.map((i) => i.slug))];

  const { data: dbProducts, error: prodErr } = await supabase
    .from("products")
    .select("*")
    .in("slug", slugs)
    .eq("is_active", true);

  if (prodErr || !dbProducts) {
    throw new Error("Could not verify items in your bag. Please try again.");
  }

  const productIds = dbProducts.map((p: any) => p.id);
  const { data: dbVariants } =
    productIds.length > 0
      ? await supabase
        .from("product_variants")
        .select("*")
        .in("product_id", productIds)
        .eq("is_active", true)
      : { data: [] };

  const verifiedLines: Array<{
    product_id: string;
    variant_id: string | null;
    product_slug: string;
    product_name: string;
    categories: string[];
    subcategory: string | null;
    is_on_sale: boolean;
    stitching: "unstitched" | "stitched";
    size: string | null;
    unit_price: number;
    quantity: number;
    image_url: string | null;
    stockTarget: StockItem;
  }> = [];

  for (const item of items) {
    const product = dbProducts.find((p: any) => p.slug === item.slug);
    if (!product) {
      throw new Error(`"${item.slug}" is no longer available.`);
    }

    let unitPrice: number | null = null;
    let normalizedSize: string | null = null;
    let isOnSale = false;

    if (item.stitching === "unstitched") {
      if (product.price_unstitched == null) {
        throw new Error(`"${product.name}" is only sold stitched.`);
      }
      unitPrice = Number(product.price_unstitched);
      isOnSale =
        product.was_price_unstitched != null &&
        Number(product.was_price_unstitched) > unitPrice;
      normalizedSize = null;
    } else {
      unitPrice =
        product.price_stitched != null
          ? Number(product.price_stitched)
          : product.price_unstitched != null
            ? Number(product.price_unstitched) + STITCHING_FEE
            : null;
      if (unitPrice == null) {
        throw new Error(`"${product.name}" is unavailable in stitched option.`);
      }
      isOnSale =
        product.was_price_stitched != null &&
        Number(product.was_price_stitched) > unitPrice;
      const allowedSizes: string[] = product.sizes ?? [...SIZES];
      if (!item.size || !allowedSizes.includes(item.size)) {
        throw new Error(`Please select a valid size for "${product.name}".`);
      }
      normalizedSize = item.size;
    }

    const productVariants = (dbVariants ?? []).filter((v: any) => v.product_id === product.id);
    let variantRow: any = null;
    if (productVariants.length > 0) {
      variantRow = productVariants.find(
        (v: any) =>
          v.stitching === item.stitching &&
          (item.stitching === "unstitched" ? v.size === "-" : v.size === normalizedSize),
      );
      if (!variantRow) {
        throw new Error(`Selected option for "${product.name}" is unavailable.`);
      }
      if (variantRow.price_override != null) {
        unitPrice = Number(variantRow.price_override);
      }
    }

    const categories: string[] = [...(product.categories ?? [])];
    if (product.is_ready_to_wear && !categories.includes("ready-to-wear")) {
      categories.push("ready-to-wear");
    }

    const lineName = nameWithColour({ name: product.name, colour: product.colour ?? "", colourGroup: product.colour_group });
    const displayLabel =
      item.stitching === "stitched"
        ? `${lineName} — Stitched (Size ${normalizedSize})`
        : `${lineName} — Unstitched`;

    verifiedLines.push({
      product_id: product.id,
      variant_id: variantRow?.id ?? null,
      product_slug: product.slug,
      product_name: displayLabel,
      categories,
      subcategory: product.subcategory ?? null,
      is_on_sale: isOnSale,
      stitching: item.stitching,
      size: normalizedSize,
      unit_price: unitPrice,
      quantity: item.quantity,
      image_url: product.images?.[0] ?? null,
      stockTarget: variantRow
        ? { id: variantRow.id, quantity: item.quantity, table: "product_variants", slug: product.slug }
        : { id: product.id, quantity: item.quantity, table: "products", slug: product.slug },
    });
  }

  return verifiedLines;
}

export async function placeOrderAction(rawInput: PlaceOrderInput) {
  const data = placeOrderSchema.parse(rawInput);
  const reqHeaders = await headers();
  enforceRateLimit(getClientIp({ headers: reqHeaders }), ORDER_RATE_LIMIT);

  const supabase = getSupabaseAdmin();
  const normalizedPhone = await normalizeSlPhone(data.phone);
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;

  let authenticatedUserId: string | null = null;
  try {
    const userClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (user?.id) {
      authenticatedUserId = user.id;
    }
  } catch {
    // guest checkout
  }

  if (data.idempotency_key) {
    const { data: existing } = await supabase
      .from("orders")
      .select("order_number,subtotal,delivery_fee,discount_amount,coupon_code,total,status,payment_method")
      .eq("idempotency_key", data.idempotency_key)
      .maybeSingle();
    if (existing) {
      return {
        order_number: existing.order_number as string,
        subtotal: Number(existing.subtotal),
        delivery_fee: Number(existing.delivery_fee),
        discount_amount: Number(existing.discount_amount),
        coupon_code: existing.coupon_code as string | null,
        total: Number(existing.total),
        status: existing.status as string,
        payment_method: existing.payment_method as "cod" | "bank" | "card",
      };
    }
  }

  const verifiedLines = await resolveAuthoritativeLines(data.items);
  const subtotal = verifiedLines.reduce((sum, l) => sum + l.unit_price * l.quantity, 0);
  const pieces = verifiedLines.reduce((n, l) => n + l.quantity, 0);
  const deliveryFee = subtotal >= FREE_DELIVERY_FROM ? 0 : deliveryFeeFor(pieces);

  let discountAmount = 0;
  const normalizedCoupon = data.coupon_code?.trim().toUpperCase() || null;
  if (normalizedCoupon) {
    const couponRes = await validateAndCalculateCoupon({
      code: normalizedCoupon,
      items: verifiedLines.map((l) => ({
        product_id: l.product_id,
        slug: l.product_slug,
        price: l.unit_price,
        quantity: l.quantity,
        is_on_sale: l.is_on_sale,
        categories: l.categories,
        subcategory: l.subcategory,
      })),
      deliveryFee,
      customer: {
        phone: normalizedPhone,
        email: cleanEmail,
        user_id: authenticatedUserId,
      },
      requireCustomerForFirstOrder: true,
    });
    if (!couponRes.valid) {
      throw new Error(couponRes.message);
    }
    discountAmount = couponRes.discount_amount;
  }

  const total = Math.max(0, subtotal + deliveryFee - discountAmount);
  const isCard = data.payment_method === "card";
  const holdExpiry = isCard ? new Date(Date.now() + 15 * 60 * 1000) : null;
  const initialStatus = isCard
    ? "payment_pending"
    : data.payment_method === "bank" || requiresCodDeposit(data.payment_method, total)
      ? "awaiting_bank_slip"
      : "pending";
  const dbStockTargets = verifiedLines.map((l) => l.stockTarget);

  // ATOMICALLY DEDUCT / HOLD STOCK UPFRONT
  await deductStock(dbStockTargets);

  let createdOrder: any = null;
  let checkoutUrl: string | undefined;

  try {
    const { data: orderRow, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: authenticatedUserId,
        customer_name: data.name,
        phone: normalizedPhone,
        email: cleanEmail,
        address: data.address,
        city: data.city,
        district: data.district,
        postal_code: data.postal_code || null,
        notes: data.note || null,
        subtotal,
        delivery_fee: deliveryFee,
        coupon_code: normalizedCoupon,
        discount_amount: discountAmount,
        total,
        payment_method: data.payment_method,
        status: initialStatus,
        stock_reserved: isCard,
        hold_expires_at: holdExpiry ? holdExpiry.toISOString() : null,
        ...(data.idempotency_key ? { idempotency_key: data.idempotency_key } : {}),
      })
      .select("id,order_number,total,status,payment_method")
      .single();

    if (orderErr) {
      if (orderErr.code === "23505" && orderErr.message?.includes("idempotency_key")) {
        await restoreStock(dbStockTargets);
        const { data: existing } = await supabase
          .from("orders")
          .select("order_number,subtotal,delivery_fee,discount_amount,coupon_code,total,status,payment_method")
          .eq("idempotency_key", data.idempotency_key!)
          .single();
        return {
          order_number: existing!.order_number as string,
          subtotal: Number(existing!.subtotal),
          delivery_fee: Number(existing!.delivery_fee),
          discount_amount: Number(existing!.discount_amount),
          coupon_code: existing!.coupon_code as string | null,
          total: Number(existing!.total),
          status: existing!.status as string,
          payment_method: existing!.payment_method as "cod" | "bank" | "card",
        };
      }
      throw orderErr;
    }

    createdOrder = orderRow;

    const { error: itemsErr } = await supabase.from("order_items").insert(
      verifiedLines.map((l) => ({
        order_id: createdOrder.id,
        product_id: l.product_id,
        variant_id: l.variant_id,
        product_slug: l.product_slug,
        product_name: l.product_name,
        stitching: l.stitching,
        size: l.size,
        unit_price: l.unit_price,
        quantity: l.quantity,
        image_url: l.image_url,
      })),
    );
    if (itemsErr) throw itemsErr;

    if (normalizedCoupon) {
      const { data: incOk, error: incErr } = await supabase.rpc("increment_coupon_usage", {
        p_code: normalizedCoupon,
      });
      if (incErr || !incOk) {
        throw new Error("This promo code has reached its usage limit.");
      }
    }

    // Step 4.2: Create Payments.lk session if paying by card
    if (isCard) {
      const lk = getPaymentsLkClient();
      const amountCents = Math.round(total * 100);
      const origin = getSiteOrigin();

      const checkout = await lk.checkouts.create(
        {
          amountCents,
          description: buildCheckoutDescription(
            verifiedLines.map((l) => ({ product_name: l.product_name, quantity: l.quantity })),
          ),
          reference: String(createdOrder.order_number || createdOrder.id),
          successUrl: `${origin}/order-confirmed?order=${createdOrder.order_number}&method=card`,
          cancelUrl: `${origin}/api/cancel-card-checkout?order_id=${createdOrder.id}`,
        },
        { idempotencyKey: `order-${createdOrder.id}` },
      );

      checkoutUrl = checkout.url;
    }
  } catch (err) {
    await restoreStock(dbStockTargets);
    if (createdOrder?.id) {
      if (isCard) {
        await supabase
          .from("orders")
          .update({
            status: "cancelled",
            stock_reserved: false,
            updated_at: new Date().toISOString(),
          })
          .eq("id", createdOrder.id);
      } else {
        await supabase.from("order_items").delete().eq("order_id", createdOrder.id);
        await supabase.from("orders").delete().eq("id", createdOrder.id);
      }
    }
    if (normalizedCoupon) {
      try {
        await supabase.rpc("decrement_coupon_usage", { p_code: normalizedCoupon });
      } catch {
        // non-blocking
      }
    }
    throw err instanceof Error ? err : new Error("Could not place your order. Please try again.");
  }

  revalidateCatalogCache(
    verifiedLines.map((l) => l.product_slug),
    verifiedLines.flatMap((l) => l.categories),
  );

  // Send confirmation email immediately only for non-card orders.
  // Card orders get their confirmation email sent via the webhook upon payment.succeeded!
  if (!isCard && cleanEmail) {
    after(() =>
      notifyOrderPlaced(createdOrder.id).catch((e) => console.error("[order] Email notification failed:", e)),
    );
  }

  return {
    order_number: createdOrder.order_number as string,
    subtotal,
    delivery_fee: deliveryFee,
    discount_amount: discountAmount,
    coupon_code: normalizedCoupon,
    total: Number(createdOrder.total),
    status: createdOrder.status as string,
    payment_method: createdOrder.payment_method as "cod" | "bank" | "card",
    checkout_url: checkoutUrl,
  };
}

export async function initiateCardCheckoutAction(rawInput: PlaceOrderInput): Promise<PlaceOrderResult> {
  return placeOrderAction({ ...rawInput, payment_method: "card" });
}

export const initiateCardCheckout = initiateCardCheckoutAction;

export type OrderConfirmationResult = {
  number: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  method: "standard";
  payment: "cod" | "bank" | "card";
  subtotal: number;
  delivery: number;
  couponCode: string | null;
  discountAmount: number;
  total: number;
  status: string;
  lines: Array<{
    key: string;
    slug: string;
    name: string;
    image: string;
    unitPrice: number;
    stitching: "unstitched" | "stitched";
    size?: string;
    qty: number;
  }>;
};

export async function getOrderConfirmationAction(
  orderNumber: string,
): Promise<OrderConfirmationResult | null> {
  const rawNum = (orderNumber || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!rawNum) return null;
  const normalizedNum = rawNum.startsWith("ALM-") ? rawNum : `ALM-${rawNum.replace(/^ALM/, "")}`;

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("order_number", normalizedNum)
    .maybeSingle();

  if (error || !order) return null;

  return {
    number: order.order_number,
    name: order.customer_name,
    phone: order.phone,
    address: `${order.address}, ${order.city}`,
    district: order.district,
    method: "standard",
    payment: order.payment_method as "cod" | "bank" | "card",
    subtotal: Number(order.subtotal ?? 0),
    delivery: Number(order.delivery_fee ?? 0),
    couponCode: order.coupon_code ?? null,
    discountAmount: Number(order.discount_amount ?? 0),
    total: Number(order.total ?? 0),
    status: order.status,
    lines: (order.order_items ?? []).map((item: any) => ({
      key: `${item.product_slug}-${item.stitching}-${item.size ?? "none"}`,
      slug: item.product_slug,
      name: item.product_name,
      image: item.image_url || "",
      unitPrice: Number(item.unit_price ?? 0),
      stitching: item.stitching,
      size: item.size || undefined,
      qty: Number(item.quantity ?? 1),
    })),
  };
}

export type TrackedOrderResult = {
  order_number: string;
  customer_name: string;
  phone: string;
  city: string;
  district: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  coupon_code: string | null;
  total: number;
  advance_deposit: number;
  advance_deposit_at: string | null;
  refund_amount: number;
  payment_method: "cod" | "bank" | "card";
  status: string;
  created_at: string;
  items: Array<{
    id: string;
    product_slug: string;
    product_name: string;
    stitching: "unstitched" | "stitched";
    size: string | null;
    unit_price: number;
    quantity: number;
    image_url: string | null;
  }>;
};

export async function lookupOrderAction(input: {
  orderNumber: string;
  phone: string;
}): Promise<TrackedOrderResult | null> {
  const hdrs = await headers();
  const ip = getClientIp({ headers: hdrs });
  enforceRateLimit(ip, {
    namespace: "lookup-order",
    maxRequests: 15,
    windowMs: 5 * 60 * 1000,
  });

  const rawNum = (input.orderNumber || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (!rawNum) {
    throw new Error("Please enter your order number (e.g. ALM-10001).");
  }
  const normalizedOrderNum = rawNum.startsWith("ALM-") ? rawNum : `ALM-${rawNum.replace(/^ALM/, "")}`;

  const rawPhone = (input.phone || "").trim().replace(/[\s-]/g, "");
  if (!SL_PHONE_REGEX.test(rawPhone)) {
    throw new Error("Please enter the Sri Lankan mobile number used at checkout (07XXXXXXXX).");
  }
  const normalizedPhone = await normalizeSlPhone(rawPhone);

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from("orders")
    .select("*, order_items (*)")
    .eq("order_number", normalizedOrderNum)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (error || !order) {
    return null;
  }

  return {
    order_number: order.order_number,
    customer_name: order.customer_name,
    phone: order.phone,
    city: order.city,
    district: order.district,
    subtotal: Number(order.subtotal ?? 0),
    delivery_fee: Number(order.delivery_fee ?? 0),
    discount_amount: Number(order.discount_amount ?? 0),
    coupon_code: order.coupon_code ?? null,
    total: Number(order.total ?? 0),
    advance_deposit: Number(order.advance_deposit ?? 0),
    advance_deposit_at: order.advance_deposit_at ?? null,
    refund_amount: Number(order.refund_amount ?? 0),
    payment_method: order.payment_method,
    status: order.status,
    created_at: order.created_at,
    items: (order.order_items ?? []).map((item: any) => ({
      id: item.id,
      product_slug: item.product_slug,
      product_name: item.product_name,
      stitching: item.stitching,
      size: item.size ?? null,
      unit_price: Number(item.unit_price ?? 0),
      quantity: Number(item.quantity ?? 1),
      image_url: item.image_url ?? null,
    })),
  };
}
