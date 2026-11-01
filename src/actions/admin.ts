"use server";

import { z } from "zod";
import { assertAdmin, logAuditEvent } from "@/lib/admin-auth.server";
import { refreshCategoriesCache, refreshHeroCache, revalidateCatalogCache } from "@/lib/cache-invalidation.server";
import {
  categories as frontendCategories,
  categoryGroups,
  DEFAULT_HERO,
  HERO_SEASON_MAX,
  type CategorySlug,
} from "@/lib/catalog";
import { restoreStock, type StockItem } from "@/lib/stock-helpers.server";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase/admin.server";

export async function getAdminStatusAction(accessToken?: string | null) {
  const configured = isSupabaseAdminConfigured();
  if (!configured) {
    return {
      supabaseConfigured: false,
      authenticated: false,
      email: null,
      error: "Supabase credentials are not configured in .env.local.",
    };
  }
  try {
    const admin = await assertAdmin(accessToken);
    return { supabaseConfigured: true, authenticated: true, email: admin.email };
  } catch (e) {
    return {
      supabaseConfigured: true,
      authenticated: false,
      email: null,
      error: e instanceof Error ? e.message : "Unauthorized",
    };
  }
}

function buildFrontendCategoryRows() {
  return frontendCategories.map((c, idx) => {
    const group =
      categoryGroups.find((g) => g.slugs.includes(c.slug))?.title ?? "Everyday";
    return {
      slug: c.slug,
      name: c.name,
      nav_group: group,
      subcategories: c.subcategories ?? [],
      description: c.blurb,
      image_url: c.image,
      sort_order: idx + 1,
      is_active: true,
    };
  });
}

export async function getAdminDashboardDataAction(accessToken?: string | null) {
  await assertAdmin(accessToken);
  const frontendCategoryRows = buildFrontendCategoryRows();
  const supabase = getSupabaseAdmin(accessToken);

  // Seed any missing storefront categories, without overwriting edits made in the console
  await supabase
    .from("categories")
    .upsert(frontendCategoryRows, { onConflict: "slug", ignoreDuplicates: true });

  const [categoriesRes, productsRes, ordersRes, couponsRes, auditRes, heroRes] = await Promise.all([
    supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("products")
      .select("*, product_variants(*)")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("coupons").select("*").order("created_at", { ascending: false }),
    supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("site_settings").select("value").eq("key", "hero").maybeSingle(),
  ]);

  return {
    supabaseConfigured: true,
    categories:
      categoriesRes.data && categoriesRes.data.length > 0
        ? categoriesRes.data
        : frontendCategoryRows,
    products: productsRes.data ?? [],
    orders: ordersRes.data ?? [],
    coupons: couponsRes.data ?? [],
    auditLogs: auditRes.data ?? [],
    hero: { ...DEFAULT_HERO, ...(heroRes.data?.value ?? {}) },
  };
}

export async function upsertProductAction(
  accessToken: string | null | undefined,
  payload: {
    id?: string;
    slug: string;
    name: string;
    categories: CategorySlug[];
    subcategory?: string | null;
    colour: string;
    fabric: string;
    price_unstitched?: number | null;
    price_stitched?: number | null;
    was_price_unstitched?: number | null;
    was_price_stitched?: number | null;
    images: string[];
    pieces: string[];
    sizes: string[];
    tags: ("new" | "bestseller" | "festive")[];
    description: string;
    care?: string | null;
    stock: number;
    unstitched_stock?: number | null;
    size_stocks?: Record<string, number>;
    is_featured: boolean;
    is_active: boolean;
  },
) {
  const admin = await assertAdmin(accessToken);
  const supabase = getSupabaseAdmin(accessToken);

  const normalizedSizes =
    payload.sizes.length > 0 ? payload.sizes : ["XS", "S", "M", "L", "XL"];

  const unstitchedQty =
    payload.price_unstitched != null
      ? Math.max(0, Math.floor(Number(payload.unstitched_stock ?? 0)))
      : 0;

  const stitchedSizeTotal =
    payload.price_stitched != null
      ? normalizedSizes.reduce(
          (sum, sz) => sum + Math.max(0, Math.floor(Number(payload.size_stocks?.[sz] ?? 0))),
          0,
        )
      : 0;

  const hasVariantBreakdown =
    payload.unstitched_stock !== undefined || payload.size_stocks !== undefined;

  const computedTotalStock = hasVariantBreakdown
    ? unstitchedQty + stitchedSizeTotal
    : Math.max(0, Math.floor(payload.stock));

  const row = {
    slug: payload.slug.trim().toLowerCase(),
    name: payload.name.trim(),
    categories: payload.categories,
    subcategory: payload.subcategory?.trim() || null,
    colour: payload.colour.trim(),
    fabric: payload.fabric.trim(),
    price_unstitched: payload.price_unstitched ?? null,
    price_stitched: payload.price_stitched ?? null,
    was_price_unstitched: payload.was_price_unstitched ?? null,
    was_price_stitched: payload.was_price_stitched ?? null,
    images: payload.images,
    pieces: payload.pieces,
    sizes: normalizedSizes,
    tags: payload.tags,
    description: payload.description.trim(),
    care: payload.care?.trim() || null,
    stock: computedTotalStock,
    is_featured: payload.is_featured,
    is_active: payload.is_active,
    updated_at: new Date().toISOString(),
    ...(payload.id ? { id: payload.id } : {}),
  };

  const { data, error } = await supabase
    .from("products")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  // Sync per-option and per-size inventory rows in public.product_variants
  const desiredVariants: Array<{
    product_id: string;
    stitching: "unstitched" | "stitched";
    size: string;
    stock: number;
    is_active: boolean;
    sort_order: number;
  }> = [];

  if (payload.price_unstitched != null) {
    desiredVariants.push({
      product_id: data.id,
      stitching: "unstitched",
      size: "-",
      stock: unstitchedQty,
      is_active: true,
      sort_order: 0,
    });
  }

  if (payload.price_stitched != null) {
    normalizedSizes.forEach((sz, idx) => {
      desiredVariants.push({
        product_id: data.id,
        stitching: "stitched",
        size: sz,
        stock: Math.max(0, Math.floor(Number(payload.size_stocks?.[sz] ?? 0))),
        is_active: true,
        sort_order: idx + 1,
      });
    });
  }

  // Remove any obsolete variant rows for this product that are no longer active
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("id, stitching, size")
    .eq("product_id", data.id);

  const desiredKeys = new Set(desiredVariants.map((v) => `${v.stitching}:${v.size}`));
  const obsoleteIds = (existingVariants ?? [])
    .filter((v: any) => !desiredKeys.has(`${v.stitching}:${v.size}`))
    .map((v: any) => v.id);

  if (obsoleteIds.length > 0) {
    await supabase.from("product_variants").delete().in("id", obsoleteIds);
  }

  if (desiredVariants.length > 0) {
    const { error: varErr } = await supabase
      .from("product_variants")
      .upsert(desiredVariants, { onConflict: "product_id,stitching,size" });
    if (varErr) throw new Error(varErr.message);
  }

  await logAuditEvent({
    userId: admin.userId,
    action: "upsert_product",
    entityType: "product",
    entityId: data.id,
    details: {
      slug: data.slug,
      stock: computedTotalStock,
      unstitched_stock: payload.price_unstitched != null ? unstitchedQty : null,
      size_stocks: payload.price_stitched != null ? payload.size_stocks : null,
    },
    accessToken,
  });

  revalidateCatalogCache([data.slug], data.categories);
  return data;
}

export async function updateOrderStatusAction(
  accessToken: string | null | undefined,
  params: {
    orderId: string;
    nextStatus:
      | "pending"
      | "awaiting_bank_slip"
      | "confirmed"
      | "shipped"
      | "delivered"
      | "cancelled"
      | "processing_failed";
  },
) {
  const admin = await assertAdmin(accessToken);
  const supabase = getSupabaseAdmin(accessToken);
  const { data: order, error: fetchErr } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.orderId)
    .single();

  if (fetchErr || !order) throw new Error("Order not found.");
  const prevStatus: string = order.status;
  if (prevStatus === params.nextStatus) return order;

  const activeStatuses = ["pending", "awaiting_bank_slip", "confirmed", "shipped", "payment_pending"];
  if (params.nextStatus === "cancelled" && activeStatuses.includes(prevStatus)) {
    const stockItems: StockItem[] = (order.order_items ?? [])
      .map((item: any) =>
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

    if (stockItems.length > 0) {
      await restoreStock(stockItems);
      revalidateCatalogCache(stockItems.map((s) => s.slug));
    }

    if (order.coupon_code) {
      await supabase.rpc("decrement_coupon_usage", { p_code: order.coupon_code });
    }
  }

  const { data: updated, error: updateErr } = await supabase
    .from("orders")
    .update({
      status: params.nextStatus,
      stock_reserved: params.nextStatus === "cancelled" ? false : order.stock_reserved,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (updateErr) throw new Error(updateErr.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "update_order_status",
    entityType: "order",
    entityId: params.orderId,
    details: { order_number: order.order_number, from: prevStatus, to: params.nextStatus },
    accessToken,
  });

  if (order.email) {
    import("@/lib/email/notifications.server")
      .then(({ notifyOrderStatus }) => notifyOrderStatus(order.id, params.nextStatus))
      .catch(() => {});
  }

  return updated;
}

export async function recordBankDepositAction(
  accessToken: string | null | undefined,
  params: {
    orderId: string;
    depositAmount: number;
    slipReference: string;
    depositNote?: string | null;
    confirmOrder?: boolean;
  },
) {
  const admin = await assertAdmin(accessToken);
  const supabase = getSupabaseAdmin(accessToken);
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", params.orderId)
    .single();
  if (!order) throw new Error("Order not found.");

  const orderTotal = Number(order.total ?? 0);
  if (params.depositAmount < 0 || params.depositAmount > orderTotal) {
    throw new Error(`Deposit amount must be between Rs. 0 and Rs. ${orderTotal.toLocaleString("en-LK")}.`);
  }

  const nextStatus = params.confirmOrder ? "confirmed" : order.status;

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      advance_deposit: Math.max(0, params.depositAmount),
      bank_slip_reference: params.slipReference.trim() || null,
      advance_deposit_note: params.depositNote?.trim() || null,
      advance_deposit_at: new Date().toISOString(),
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "record_bank_slip",
    entityType: "order",
    entityId: params.orderId,
    details: {
      order_number: order.order_number,
      depositAmount: params.depositAmount,
      slipReference: params.slipReference,
      depositNote: params.depositNote ?? null,
      status: nextStatus,
    },
    accessToken,
  });

  if (order.email && params.depositAmount > 0) {
    import("@/lib/email/notifications.server")
      .then(({ notifyCodDepositReceived }) => notifyCodDepositReceived(order.id))
      .catch(() => {});
  }

  return updated;
}

export async function refundOrderAction(
  accessToken: string | null | undefined,
  params: {
    orderId: string;
    refundAmount: number;
    reason: string;
  },
) {
  const admin = await assertAdmin(accessToken);
  const supabase = getSupabaseAdmin(accessToken);
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", params.orderId)
    .single();

  if (!order) throw new Error("Order not found.");

  const existingRefund = Number(order.refund_amount ?? 0);
  const newRefundTotal = existingRefund + Number(params.refundAmount);
  const orderTotal = Number(order.total);

  if (params.refundAmount <= 0 || newRefundTotal > orderTotal) {
    throw new Error(`Refund amount cannot exceed remaining order total (${orderTotal - existingRefund}).`);
  }

  const isFullRefund = newRefundTotal >= orderTotal;
  const nextStatus = isFullRefund ? "refunded" : "partially_refunded";

  if (isFullRefund && order.status !== "cancelled" && order.status !== "refunded") {
    const stockItems: StockItem[] = (order.order_items ?? [])
      .map((item: any) =>
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

    if (stockItems.length > 0) {
      await restoreStock(stockItems);
      revalidateCatalogCache(stockItems.map((s) => s.slug));
    }

    if (order.coupon_code) {
      await supabase.rpc("decrement_coupon_usage", { p_code: order.coupon_code });
    }
  }

  const { data: updated, error } = await supabase
    .from("orders")
    .update({
      refund_amount: newRefundTotal,
      refund_reason: params.reason.trim() || null,
      refunded_at: new Date().toISOString(),
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "refund_order",
    entityType: "order",
    entityId: params.orderId,
    details: {
      order_number: order.order_number,
      refunded: params.refundAmount,
      totalRefunded: newRefundTotal,
      status: nextStatus,
    },
    accessToken,
  });

  return updated;
}

const couponInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    code: z
      .string()
      .trim()
      .min(2, "Promo code must be at least 2 characters.")
      .max(40, "Promo code cannot exceed 40 characters.")
      .regex(/^[A-Za-z0-9_-]+$/, "Promo code can only contain letters, numbers, hyphens, and underscores."),
    discount_type: z.enum(["percentage", "fixed", "free_delivery"]),
    discount_value: z.number().min(0, "Discount value cannot be negative."),
    min_order_value: z.number().min(0, "Minimum order value cannot be negative."),
    max_discount_amount: z.number().min(0).optional().nullable(),
    max_uses: z.number().int().min(1).optional().nullable(),
    expires_at: z.string().optional().nullable(),
    is_active: z.boolean(),
    is_public: z.boolean().optional().default(true),
    first_order_only: z.boolean(),
    exclude_sale_items: z.boolean().optional().default(false),
    allowed_categories: z.array(z.string()).default([]),
    allowed_subcategories: z.array(z.string()).default([]),
  })
  .refine(
    (c) => c.discount_type !== "percentage" || (c.discount_value > 0 && c.discount_value <= 100),
    {
      message: "Percentage discount must be between 1% and 100%.",
      path: ["discount_value"],
    },
  );

export async function upsertCouponAction(
  accessToken: string | null | undefined,
  rawPayload: z.input<typeof couponInputSchema>,
) {
  const admin = await assertAdmin(accessToken);
  const payload = couponInputSchema.parse(rawPayload);
  const supabase = getSupabaseAdmin(accessToken);

  const row = {
    code: payload.code.trim().toUpperCase(),
    discount_type: payload.discount_type,
    discount_value:
      payload.discount_type === "free_delivery" ? 0 : Math.max(0, payload.discount_value),
    min_order_value: Math.max(0, payload.min_order_value),
    max_discount_amount:
      payload.max_discount_amount && payload.max_discount_amount > 0
        ? payload.max_discount_amount
        : null,
    max_uses: payload.max_uses && payload.max_uses > 0 ? Math.floor(payload.max_uses) : null,
    expires_at: payload.expires_at ? new Date(payload.expires_at).toISOString() : null,
    is_active: payload.is_active,
    is_public: payload.is_public ?? true,
    first_order_only: payload.first_order_only,
    exclude_sale_items: payload.exclude_sale_items ?? false,
    allowed_categories: payload.allowed_categories,
    allowed_subcategories: payload.allowed_subcategories,
    updated_at: new Date().toISOString(),
    ...(payload.id ? { id: payload.id } : {}),
  };

  const { data, error } = await supabase
    .from("coupons")
    .upsert(row, { onConflict: "code" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "upsert_coupon",
    entityType: "coupon",
    entityId: data.id,
    details: {
      code: data.code,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      is_public: data.is_public,
      first_order_only: data.first_order_only,
    },
    accessToken,
  });

  return data;
}

export async function deleteCouponAction(
  accessToken: string | null | undefined,
  couponId: string,
) {
  const admin = await assertAdmin(accessToken);
  const supabase = getSupabaseAdmin(accessToken);

  const { data: existing } = await supabase
    .from("coupons")
    .select("id, code")
    .eq("id", couponId)
    .maybeSingle();

  const { error } = await supabase.from("coupons").delete().eq("id", couponId);
  if (error) throw new Error(error.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "delete_coupon",
    entityType: "coupon",
    entityId: couponId,
    details: { code: existing?.code ?? couponId },
    accessToken,
  });

  return { ok: true };
}


const categoryInputSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Category slug must be lowercase letters, numbers, and hyphens."),
  name: z.string().trim().min(2).max(80),
  nav_group: z.enum(["Everyday", "Special", "More"]).default("Everyday"),
  subcategories: z.array(z.string()).default([]),
  description: z.string().trim().default(""),
  image_url: z.string().trim().default(""),
  sort_order: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});

export async function upsertCategoryAction(
  accessToken: string | null | undefined,
  rawPayload: z.input<typeof categoryInputSchema>,
) {
  const admin = await assertAdmin(accessToken);
  const payload = categoryInputSchema.parse(rawPayload);
  const supabase = getSupabaseAdmin(accessToken);

  const row = {
    slug: payload.slug,
    name: payload.name,
    nav_group: payload.nav_group,
    subcategories: payload.subcategories.map((s) => s.trim()).filter(Boolean),
    description: payload.description,
    image_url: payload.image_url,
    sort_order: payload.sort_order,
    is_active: payload.is_active,
    ...(payload.id ? { id: payload.id } : {}),
  };

  const { data, error } = await supabase
    .from("categories")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "upsert_category",
    entityType: "category",
    entityId: data.id,
    details: { slug: data.slug, name: data.name, subcategories: data.subcategories },
    accessToken,
  });

  revalidateCatalogCache([], [data.slug]);
  refreshCategoriesCache();
  return data;
}

export async function reorderCategoriesAction(
  accessToken: string | null | undefined,
  rawSlugs: string[],
) {
  const admin = await assertAdmin(accessToken);
  const slugs = z.array(z.string().trim().min(2).max(50)).min(1).max(200).parse(rawSlugs);
  const supabase = getSupabaseAdmin(accessToken);

  const results = await Promise.all(
    slugs.map((slug, i) => supabase.from("categories").update({ sort_order: i + 1 }).eq("slug", slug)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  await logAuditEvent({
    userId: admin.userId,
    action: "reorder_categories",
    entityType: "category",
    entityId: null,
    details: { order: slugs },
    accessToken,
  });

  refreshCategoriesCache();
  return slugs;
}

const heroInputSchema = z.object({
  productSlug: z.string().trim().min(1).max(200).nullable(),
  imageUrl: z.string().trim().url().nullable(),
  seasonText: z.string().trim().max(HERO_SEASON_MAX),
});

export async function updateHeroAction(
  accessToken: string | null | undefined,
  rawPayload: z.input<typeof heroInputSchema>,
) {
  const admin = await assertAdmin(accessToken);
  const value = heroInputSchema.parse(rawPayload);
  const supabase = getSupabaseAdmin(accessToken);

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "hero", value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) {
    throw new Error(
      error.code === "PGRST205" || error.code === "42P01"
        ? "Homepage settings aren't set up yet. Run the latest database update, then try again."
        : error.message,
    );
  }

  await logAuditEvent({
    userId: admin.userId,
    action: "update_hero",
    entityType: "site_settings",
    entityId: null,
    details: { slug: value.productSlug ?? "newest product", seasonText: value.seasonText },
    accessToken,
  });

  refreshHeroCache();
  return value;
}
