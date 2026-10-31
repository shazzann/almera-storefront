import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin.server";

export type AuthoritativeCouponItem = {
  product_id?: string;
  slug: string;
  price: number;
  quantity: number;
  is_on_sale?: boolean;
  categories?: string[];
  subcategory?: string | null;
};

export type CouponValidationResult =
  | {
      valid: true;
      code: string;
      type: "percentage" | "fixed" | "free_delivery";
      discount_amount: number;
      discount_value: number;
      is_free_delivery: boolean;
      first_order_only: boolean;
      max_discount_amount: number | null;
      message: string;
    }
  | {
      valid: false;
      message: string;
    };

export type PublicCouponSummary = {
  code: string;
  discount_type: "percentage" | "fixed" | "free_delivery";
  discount_value: number;
  min_order_value: number;
  max_discount_amount: number | null;
  first_order_only: boolean;
  exclude_sale_items: boolean;
  allowed_categories: string[];
  allowed_subcategories: string[];
};

export function normalizeSlPhoneSync(raw: string): string {
  const digits = raw.replace(/[\s-]/g, "").replace(/^\+94/, "0");
  return digits.startsWith("0") ? digits : `0${digits}`;
}

export async function validateAndCalculateCoupon(input: {
  code: string;
  items: AuthoritativeCouponItem[];
  deliveryFee: number;
  customer?: {
    phone?: string | null;
    email?: string | null;
    user_id?: string | null;
  };
  requireCustomerForFirstOrder?: boolean;
}): Promise<CouponValidationResult> {
  // Step 1: Normalize code
  const normalized = input.code.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: "Enter a promo code." };
  }

  if (!isSupabaseConfigured()) {
    return { valid: false, message: "Promo code service is unavailable." };
  }

  const supabase = getSupabaseAdmin();

  // Step 2: Existence, Active, Expiry & Usage Quota
  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalized)
    .maybeSingle();

  if (error || !coupon || !coupon.is_active) {
    return { valid: false, message: "This promo code is not valid." };
  }

  if (coupon.expires_at && new Date(coupon.expires_at).getTime() < Date.now()) {
    return { valid: false, message: "This promo code has expired." };
  }

  if (coupon.max_uses !== null && Number(coupon.used_count) >= Number(coupon.max_uses)) {
    return { valid: false, message: "This promo code has reached its usage limit." };
  }

  // Step 3: First-Order-Only Verification
  if (coupon.first_order_only) {
    const cleanPhone = input.customer?.phone?.trim()
      ? normalizeSlPhoneSync(input.customer.phone.trim()).replace(/[,()"'\\]/g, "")
      : null;
    const cleanEmail = input.customer?.email?.trim()
      ? input.customer.email.trim().toLowerCase().replace(/[,()"'\\]/g, "")
      : null;
    const userId = input.customer?.user_id?.trim()
      ? input.customer.user_id.trim().replace(/[^a-zA-Z0-9-]/g, "")
      : null;

    if (!cleanPhone && !cleanEmail && !userId) {
      if (input.requireCustomerForFirstOrder) {
        return {
          valid: false,
          message: "Please enter your phone number to verify first-order eligibility.",
        };
      }
    } else {
      const orConds: string[] = [];
      if (cleanPhone) orConds.push(`phone.eq.${cleanPhone}`);
      if (cleanEmail) orConds.push(`email.ilike.${cleanEmail}`);
      if (userId) orConds.push(`user_id.eq.${userId}`);

      if (orConds.length > 0) {
        const { data: prior } = await supabase
          .from("orders")
          .select("id")
          .neq("status", "cancelled")
          .or(orConds.join(","))
          .limit(1);

        if (prior && prior.length > 0) {
          return {
            valid: false,
            message: "This promo code is only valid for your first order.",
          };
        }
      }
    }
  }

  // Step 4: Sale / Markdown Exclusion
  let eligibleItems = [...input.items];
  if (coupon.exclude_sale_items) {
    eligibleItems = eligibleItems.filter((item) => !item.is_on_sale);
    if (eligibleItems.length === 0) {
      return {
        valid: false,
        message: "This promo code cannot be combined with already discounted pieces.",
      };
    }
  }

  // Step 5: Category & Subcategory Scoping
  const allowedCategories: string[] = Array.isArray(coupon.allowed_categories)
    ? coupon.allowed_categories
    : [];
  const allowedSubcategories: string[] = Array.isArray(coupon.allowed_subcategories)
    ? coupon.allowed_subcategories
    : [];

  if (allowedCategories.length > 0) {
    eligibleItems = eligibleItems.filter((item) =>
      (item.categories ?? []).some((c) => allowedCategories.includes(c)),
    );
  }

  if (allowedSubcategories.length > 0) {
    eligibleItems = eligibleItems.filter(
      (item) => item.subcategory && allowedSubcategories.includes(item.subcategory),
    );
  }

  const eligibleSubtotal = eligibleItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  if (eligibleSubtotal <= 0) {
    return {
      valid: false,
      message: "None of the items in your bag qualify for this promo code.",
    };
  }

  // Step 6: Minimum Spend & Capped Discount Math
  const minOrderValue = Number(coupon.min_order_value ?? 0);
  if (minOrderValue > eligibleSubtotal) {
    return {
      valid: false,
      message: `Spend at least Rs. ${minOrderValue.toLocaleString("en-LK")} on eligible items to use this code.`,
    };
  }

  const discountType = coupon.discount_type as "percentage" | "fixed" | "free_delivery";
  const discountValue = Number(coupon.discount_value ?? 0);
  const maxDiscountAmount =
    coupon.max_discount_amount != null && Number(coupon.max_discount_amount) > 0
      ? Number(coupon.max_discount_amount)
      : null;

  if (discountType === "free_delivery") {
    if (input.deliveryFee === 0) {
      return {
        valid: true,
        code: coupon.code,
        type: "free_delivery",
        discount_amount: 0,
        discount_value: 0,
        is_free_delivery: true,
        first_order_only: Boolean(coupon.first_order_only),
        max_discount_amount: null,
        message: "Your order already qualifies for free island-wide delivery!",
      };
    }
    return {
      valid: true,
      code: coupon.code,
      type: "free_delivery",
      discount_amount: input.deliveryFee,
      discount_value: 0,
      is_free_delivery: true,
      first_order_only: Boolean(coupon.first_order_only),
      max_discount_amount: null,
      message: `Free island-wide delivery applied (−Rs. ${input.deliveryFee.toLocaleString("en-LK")}).`,
    };
  }

  let discountAmount = 0;
  let label = "";

  if (discountType === "percentage") {
    let raw = (eligibleSubtotal * discountValue) / 100;
    if (maxDiscountAmount !== null) {
      raw = Math.min(raw, maxDiscountAmount);
    }
    discountAmount = Math.round(Math.min(raw, eligibleSubtotal));
    label = `${discountValue}% off applied (−Rs. ${discountAmount.toLocaleString("en-LK")}).`;
  } else {
    discountAmount = Math.round(Math.min(discountValue, eligibleSubtotal));
    label = `Rs. ${discountAmount.toLocaleString("en-LK")} discount applied.`;
  }

  return {
    valid: true,
    code: coupon.code,
    type: discountType,
    discount_amount: discountAmount,
    discount_value: discountValue,
    is_free_delivery: false,
    first_order_only: Boolean(coupon.first_order_only),
    max_discount_amount: maxDiscountAmount,
    message: label,
  };
}

export async function getPublicCoupons(): Promise<PublicCouponSummary[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("is_active", true)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    const now = Date.now();
    return data
      .filter((c: any) => {
        if (c.expires_at && new Date(c.expires_at).getTime() < now) return false;
        if (c.max_uses != null && Number(c.used_count ?? 0) >= Number(c.max_uses)) return false;
        return true;
      })
      .map((c: any) => ({
        code: c.code,
        discount_type: c.discount_type,
        discount_value: Number(c.discount_value ?? 0),
        min_order_value: Number(c.min_order_value ?? 0),
        max_discount_amount: c.max_discount_amount != null ? Number(c.max_discount_amount) : null,
        first_order_only: Boolean(c.first_order_only),
        exclude_sale_items: Boolean(c.exclude_sale_items),
        allowed_categories: Array.isArray(c.allowed_categories) ? c.allowed_categories : [],
        allowed_subcategories: Array.isArray(c.allowed_subcategories)
          ? c.allowed_subcategories
          : [],
      }));
  } catch {
    return [];
  }
}

