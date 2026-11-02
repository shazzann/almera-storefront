"use client";

import {
  deleteCouponAction,
  deleteProductAction,
  getAdminDashboardDataAction,
  openAdminConsoleAction,
  recordBankDepositAction,
  reorderCategoriesAction,
  refundOrderAction,
  updateOrderStatusAction,
  upsertCategoryAction,
  updateGalleryAction,
  updateHeroAction,
  upsertCouponAction,
  upsertProductAction,
} from "@/actions/admin";
import { optimizeImageForUpload } from "@/lib/image-optimizer";
import { buildImageUrl } from "@/lib/image-url";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminData, AdminSource, Coupon, CategoryRow, ProductPayload } from "./lib";

/** Reads the token per call, so a console left open on the phone doesn't send an expired one. */
async function token() {
  const sb = getSupabaseBrowserClient();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export const realSource: AdminSource = {
  async open() {
    const result = await openAdminConsoleAction(await token());
    if (result.ok) return { ok: true, email: result.email, data: result.data as unknown as AdminData };
    return { ok: false, error: result.error ?? "This account can't open the admin console." };
  },
  async load() {
    return (await getAdminDashboardDataAction(await token())) as unknown as AdminData;
  },
  async saveProduct(payload: ProductPayload) {
    return upsertProductAction(await token(), payload as Parameters<typeof upsertProductAction>[1]);
  },
  async setOrderStatus(orderId, nextStatus) {
    return updateOrderStatusAction(await token(), { orderId, nextStatus });
  },
  async recordDeposit(params) {
    return recordBankDepositAction(await token(), params);
  },
  async refund(params) {
    return refundOrderAction(await token(), params);
  },
  async saveCoupon(payload: Coupon) {
    const n = (v: unknown) => (v == null ? null : Number(v));
    return upsertCouponAction(await token(), {
      id: payload.id,
      code: payload.code,
      discount_type: payload.discount_type,
      discount_value: Number(payload.discount_value ?? 0),
      min_order_value: Number(payload.min_order_value ?? 0),
      max_discount_amount: n(payload.max_discount_amount),
      max_uses: n(payload.max_uses),
      expires_at: payload.expires_at ?? null,
      is_active: payload.is_active,
      is_public: payload.is_public ?? true,
      first_order_only: Boolean(payload.first_order_only),
      exclude_sale_items: Boolean(payload.exclude_sale_items),
      allowed_categories: payload.allowed_categories ?? [],
      allowed_subcategories: payload.allowed_subcategories ?? [],
    });
  },
  async deleteProduct(id) {
    return deleteProductAction(await token(), id);
  },
  async deleteCoupon(id) {
    return deleteCouponAction(await token(), id);
  },
  async saveCategory(payload: CategoryRow) {
    return upsertCategoryAction(await token(), {
      id: payload.id,
      slug: payload.slug,
      name: payload.name,
      nav_group: payload.nav_group ?? "Everyday",
      subcategories: payload.subcategories ?? [],
      description: payload.description ?? "",
      image_url: payload.image_url ?? "",
      sort_order: Number(payload.sort_order ?? 0),
      is_active: payload.is_active !== false,
    });
  },
  async reorderCategories(slugs) {
    return reorderCategoriesAction(await token(), slugs);
  },
  async saveHero(payload) {
    return updateHeroAction(await token(), payload);
  },
  async saveGallery(payload) {
    return updateGalleryAction(await token(), payload);
  },
  async uploadImage(file, folder) {
    const sb = getSupabaseBrowserClient();
    if (!sb) throw new Error("Image storage isn't set up.");
    const optimized = await optimizeImageForUpload(file);
    const safeName = optimized.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${folder}/${Date.now()}-${safeName}`;
    const { error } = await sb.storage
      .from("product-images")
      .upload(path, optimized, { contentType: optimized.type, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    // Store the canonical Edge CDN URL directly in the database
    return buildImageUrl(path);
  },
  async signOut() {
    await getSupabaseBrowserClient()?.auth.signOut();
  },
};
