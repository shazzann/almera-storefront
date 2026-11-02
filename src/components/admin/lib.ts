import { formatLKR, SIZES, type GallerySettings, type HeroSettings } from "@/lib/catalog";
import { COD_MIN_DEPOSIT, getCodBalanceDue, requiresCodDeposit } from "@/lib/cod-deposit";

export type OrderItem = {
  id: string;
  product_slug: string;
  product_name: string;
  stitching: string;
  size?: string | null;
  unit_price: number | string;
  quantity: number | string;
  image_url?: string | null;
};

export type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  email?: string | null;
  address: string;
  city: string;
  district: string;
  notes?: string | null;
  payment_method: string;
  status: string;
  subtotal: number | string;
  discount_amount?: number | string | null;
  coupon_code?: string | null;
  delivery_fee: number | string;
  total: number | string;
  advance_deposit?: number | string | null;
  bank_slip_reference?: string | null;
  advance_deposit_note?: string | null;
  refund_amount?: number | string | null;
  refund_reason?: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type Variant = { stitching: string; size: string; stock: number | string };

export type ProductRow = {
  id?: string;
  slug: string;
  name: string;
  categories: string[];
  subcategory?: string | null;
  colour: string;
  fabric: string;
  price_unstitched?: number | string | null;
  price_stitched?: number | string | null;
  was_price_unstitched?: number | string | null;
  was_price_stitched?: number | string | null;
  images: string[];
  pieces: string[];
  sizes: string[];
  tags: Tag[];
  description: string;
  care?: string | null;
  stock: number | string;
  is_featured?: boolean;
  is_active?: boolean;
  colour_group?: string | null;
  product_variants?: Variant[];
};

export type Tag = "new" | "bestseller" | "festive";

export type Coupon = {
  id?: string;
  code: string;
  discount_type: "percentage" | "fixed" | "free_delivery";
  discount_value: number | string;
  min_order_value: number | string;
  max_discount_amount?: number | string | null;
  max_uses?: number | string | null;
  used_count?: number | string | null;
  expires_at?: string | null;
  is_active: boolean;
  is_public?: boolean;
  first_order_only?: boolean;
  exclude_sale_items?: boolean;
  allowed_categories?: string[];
  allowed_subcategories?: string[];
};

export type CategoryRow = {
  id?: string;
  slug: string;
  name: string;
  nav_group?: "Everyday" | "Special" | "More";
  subcategories?: string[];
  description?: string;
  image_url?: string;
  sort_order?: number;
  is_active?: boolean;
};

export type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
};

export type AdminData = {
  categories: CategoryRow[];
  products: ProductRow[];
  orders: Order[];
  coupons: Coupon[];
  auditLogs: AuditLog[];
  hero: HeroSettings;
  gallery: GallerySettings;
};

export type ProductPayload = {
  id?: string;
  slug: string;
  name: string;
  categories: string[];
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
  tags: Tag[];
  description: string;
  care?: string | null;
  stock: number;
  unstitched_stock?: number | null;
  size_stocks?: Record<string, number>;
  is_featured: boolean;
  is_active: boolean;
  /** Slug of the product this one is another colour of. */
  colour_of?: string;
};

export type OrderStatus =
  | "pending"
  | "awaiting_bank_slip"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

/** Everything the console needs from the outside world, so screens never touch the server directly. */
export type AdminSource = {
  open(): Promise<{ ok: true; email: string; data: AdminData } | { ok: false; error: string }>;
  load(): Promise<AdminData>;
  saveProduct(payload: ProductPayload): Promise<unknown>;
  setOrderStatus(orderId: string, next: OrderStatus): Promise<unknown>;
  recordDeposit(params: {
    orderId: string;
    depositAmount: number;
    slipReference: string;
    depositNote: string;
    confirmOrder: boolean;
  }): Promise<unknown>;
  refund(params: { orderId: string; refundAmount: number; reason: string }): Promise<unknown>;
  saveCoupon(payload: Coupon): Promise<unknown>;
  deleteCoupon(id: string): Promise<unknown>;
  deleteProduct(id: string): Promise<unknown>;
  saveCategory(payload: CategoryRow): Promise<unknown>;
  reorderCategories(slugs: string[]): Promise<unknown>;
  saveHero(payload: HeroSettings): Promise<unknown>;
  saveGallery(payload: GallerySettings): Promise<unknown>;
  uploadImage(file: File, folder: string): Promise<string>;
  signOut(): Promise<void>;
};

export const num = (v: unknown) => Number(v ?? 0) || 0;

export const STATUS_LABEL: Record<string, string> = {
  pending: "New",
  awaiting_bank_slip: "Waiting for slip",
  payment_pending: "Card unpaid",
  payment_processing: "Card processing",
  paid: "Paid",
  confirmed: "To pack",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  processing_failed: "Payment failed",
  partially_refunded: "Part refunded",
  refunded: "Refunded",
};

export const STATUS_TONE: Record<string, string> = {
  pending: "bg-gold/20 text-gold-deep",
  awaiting_bank_slip: "bg-gold/20 text-gold-deep",
  paid: "bg-gold/20 text-gold-deep",
  payment_pending: "bg-mist text-ink/65",
  payment_processing: "bg-mist text-ink/65",
  confirmed: "bg-sage-soft text-sage-deep",
  shipped: "bg-olive/15 text-olive",
  delivered: "bg-ink/8 text-ink/70",
  cancelled: "bg-[#a5432f]/12 text-[#a5432f]",
  processing_failed: "bg-[#a5432f]/12 text-[#a5432f]",
  partially_refunded: "bg-[#a5432f]/12 text-[#a5432f]",
  refunded: "bg-[#a5432f]/12 text-[#a5432f]",
};

export const STATUS_CHOICES: { status: OrderStatus; title: string; body: string }[] = [
  { status: "pending", title: "New", body: "Not checked yet" },
  { status: "awaiting_bank_slip", title: "Waiting for slip", body: "Customer still needs to send the bank slip" },
  { status: "confirmed", title: "To pack", body: "Confirmed with the customer, ready to pack" },
  { status: "shipped", title: "Shipped", body: "Handed to the courier" },
  { status: "delivered", title: "Delivered", body: "Customer has the parcel" },
];

export function needsDeposit(o: Order) {
  return (
    !["cancelled", "refunded", "shipped", "delivered", "processing_failed"].includes(o.status) &&
    requiresCodDeposit(o.payment_method, num(o.total)) &&
    num(o.advance_deposit) < COD_MIN_DEPOSIT
  );
}

export const ORDER_FILTERS = [
  { key: "todo", label: "To do", test: (o: Order) => ["pending", "awaiting_bank_slip", "paid"].includes(o.status) },
  { key: "deposit", label: "Needs deposit", test: needsDeposit },
  { key: "pack", label: "To pack", test: (o: Order) => o.status === "confirmed" },
  { key: "shipped", label: "Shipped", test: (o: Order) => o.status === "shipped" },
  { key: "done", label: "Done", test: (o: Order) => ["delivered", "partially_refunded", "refunded"].includes(o.status) },
  { key: "cancelled", label: "Cancelled", test: (o: Order) => ["cancelled", "processing_failed"].includes(o.status) },
  { key: "all", label: "All", test: () => true },
] as const;

export type NextStep =
  | { kind: "status"; next: OrderStatus; label: string; body: string }
  | { kind: "deposit"; label: string };

/** The one thing the owner most likely wants to do next with this order. */
export function nextStep(o: Order): NextStep | null {
  if (needsDeposit(o) && o.status === "pending") return { kind: "deposit", label: "Record deposit" };
  switch (o.status) {
    case "pending":
    case "paid":
      return { kind: "status", next: "confirmed", label: "Confirm order", body: "Moves this order to To pack." };
    case "awaiting_bank_slip":
      return { kind: "deposit", label: "Record bank slip" };
    case "confirmed":
      return { kind: "status", next: "shipped", label: "Mark as shipped", body: "Use this once the courier has the parcel." };
    case "shipped":
      return { kind: "status", next: "delivered", label: "Mark as delivered", body: "Use this once the customer has the parcel." };
    default:
      return null;
  }
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-LK", { day: "numeric", month: "short" });
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "good morning";
  if (h < 17) return "good afternoon";
  return "good evening";
}

export function todayLabel() {
  return new Date().toLocaleDateString("en-LK", { weekday: "long", day: "numeric", month: "long" });
}

const countsAsSale = (o: Order) =>
  !["cancelled", "refunded", "payment_pending", "payment_processing", "processing_failed"].includes(o.status);

const netValue = (o: Order) => Math.max(0, num(o.total) - num(o.refund_amount));

export function salesSummary(orders: Order[]) {
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: d.toLocaleDateString("en-LK", { weekday: "short" }), date: d, total: 0, count: 0 };
  });
  for (const o of orders) {
    if (!countsAsSale(o)) continue;
    const day = days.find((x) => x.key === dayKey(new Date(o.created_at)));
    if (day) {
      day.total += netValue(o);
      day.count += 1;
    }
  }
  const today = days[6];
  const week = days.reduce((sum, d) => sum + d.total, 0);
  const toCollect = orders
    .filter((o) => countsAsSale(o) && o.status !== "delivered" && o.payment_method === "cod")
    .reduce((sum, o) => sum + getCodBalanceDue(o), 0);
  return { days, today, week, toCollect };
}

export function stockRows(p: ProductRow) {
  const variants = p.product_variants ?? [];
  const unstitched =
    p.price_unstitched != null
      ? num(variants.find((v) => v.stitching === "unstitched")?.stock ?? (p.price_stitched == null ? p.stock : 0))
      : null;
  const sizes = p.sizes?.length ? p.sizes : [...SIZES];
  const stitched =
    p.price_stitched != null
      ? sizes.map((size) => ({
          size,
          qty: num(variants.find((v) => v.stitching === "stitched" && v.size === size)?.stock),
        }))
      : [];
  return { unstitched, stitched };
}

export const stockState = (p: ProductRow) =>
  num(p.stock) === 0 ? "out" : num(p.stock) <= 3 ? "low" : "ok";

/** Matches the store: Ready to Wear is every stitched-only piece, except Western. */
export function productInCategory(p: ProductRow, slug: string) {
  if (slug === "ready-to-wear") return p.price_unstitched == null && !p.categories?.includes("western");
  return Boolean(p.categories?.includes(slug));
}

export function fromPrice(p: ProductRow) {
  const prices = [p.price_unstitched, p.price_stitched].filter((x) => x != null).map(num);
  return prices.length ? Math.min(...prices) : 0;
}

/** Rebuilds a full save payload from a product row, for small edits like stock or visibility. */
export function productPayload(p: ProductRow, changes: Partial<ProductPayload> = {}): ProductPayload {
  const { unstitched, stitched } = stockRows(p);
  const opt = (v: unknown) => (v == null ? null : num(v));
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categories: p.categories,
    subcategory: p.subcategory ?? null,
    colour: p.colour,
    fabric: p.fabric,
    price_unstitched: opt(p.price_unstitched),
    price_stitched: opt(p.price_stitched),
    was_price_unstitched: opt(p.was_price_unstitched),
    was_price_stitched: opt(p.was_price_stitched),
    images: p.images,
    pieces: p.pieces,
    sizes: p.sizes,
    tags: p.tags,
    description: p.description,
    care: p.care ?? null,
    stock: num(p.stock),
    unstitched_stock: unstitched,
    size_stocks: Object.fromEntries(stitched.map((s) => [s.size, s.qty])),
    is_featured: Boolean(p.is_featured),
    is_active: p.is_active !== false,
    ...changes,
  };
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Swaps the colour inside a name like "Lilac chikan lawn". Names without the colour stay as they are. */
export function renameForColour(name: string, from: string, to: string) {
  const word = from.trim();
  if (!word) return name;
  const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (!pattern.test(name)) return name;
  const renamed = name.replace(pattern, () => to.trim()).replace(/\s+/g, " ").trim();
  return renamed.charAt(0).toUpperCase() + renamed.slice(1);
}

export function colourGroupOf(product: ProductRow, products: ProductRow[]) {
  if (!product.colour_group) return [product];
  return products
    .filter((p) => p.colour_group === product.colour_group)
    .sort((a, b) => a.colour.localeCompare(b.colour));
}

/** Saving is keyed on the slug, so a new product must never reuse an existing one. */
export function uniqueSlug(name: string, taken: string[]) {
  const base = slugify(name) || "product";
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

export function whatsappUrl(phone: string, text: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `94${digits.slice(1)}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function orderWhatsAppText(o: Order) {
  const first = o.customer_name.split(" ")[0];
  return `Hi ${first}, this is almera about your order ${o.order_number}.`;
}

export function discountLabel(c: Coupon) {
  if (c.discount_type === "free_delivery") return "Free delivery";
  if (c.discount_type === "percentage") return `${num(c.discount_value)}% off`;
  return `${formatLKR(num(c.discount_value))} off`;
}

const escapeHtml = (raw: unknown) =>
  String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function printPackingSlip(order: Order) {
  const balanceDue = getCodBalanceDue(order);
  const items = (order.order_items ?? [])
    .map(
      (it) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #ddd;"><strong>${escapeHtml(it.product_name)}</strong><br/>
          <span style="font-size:12px;color:#555;">${escapeHtml(it.stitching)}${it.size && it.size !== "-" ? ` · Size ${escapeHtml(it.size)}` : ""}</span></td>
        <td style="padding:8px 0;border-bottom:1px solid #ddd;text-align:center;">${num(it.quantity)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #ddd;text-align:right;">${formatLKR(num(it.unit_price) * num(it.quantity))}</td>
      </tr>`,
    )
    .join("");
  const win = window.open("", "_blank", "width=760,height=900");
  if (!win) return false;
  win.document.write(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/>
    <title>Packing slip ${escapeHtml(order.order_number)} · almera</title>
    <style>
      body{font-family:Georgia,serif;color:#1f231e;padding:24px;max-width:680px;margin:0 auto}
      .top{display:flex;justify-content:space-between;border-bottom:2px solid #1f231e;padding-bottom:14px}
      .box{background:#f6f3ec;padding:14px;border-radius:10px;margin-top:16px;font-family:sans-serif;font-size:14px;line-height:1.5}
      table{width:100%;border-collapse:collapse;margin-top:18px;font-family:sans-serif;font-size:13px}
      .totals{margin-top:14px;text-align:right;font-family:sans-serif;font-size:14px}
      .totals p{margin:4px 0}
      .cod{margin-top:18px;padding:14px;border:2px solid #1f231e;text-align:center;font-family:sans-serif;font-size:16px;font-weight:bold}
    </style></head><body onload="window.print()">
    <div class="top"><h1 style="margin:0;font-size:26px;letter-spacing:.06em;">ALMERA</h1>
      <div style="text-align:right;font-family:sans-serif;"><strong style="font-size:17px;">${escapeHtml(order.order_number)}</strong><br/>
      <span style="font-size:12px;color:#555;">${new Date(order.created_at).toLocaleDateString("en-LK")}</span></div></div>
    <div class="box"><strong>Deliver to</strong><br/>${escapeHtml(order.customer_name)} · <strong>${escapeHtml(order.phone)}</strong><br/>
      ${escapeHtml(order.address)}, ${escapeHtml(order.city)}, <strong>${escapeHtml(order.district)}</strong>
      ${order.notes ? `<br/><br/><strong>Note:</strong> ${escapeHtml(order.notes)}` : ""}</div>
    <table><thead><tr><th style="text-align:left;border-bottom:1px solid #1f231e;padding-bottom:6px;">Piece</th>
      <th style="border-bottom:1px solid #1f231e;padding-bottom:6px;">Qty</th>
      <th style="text-align:right;border-bottom:1px solid #1f231e;padding-bottom:6px;">Amount</th></tr></thead><tbody>${items}</tbody></table>
    <div class="totals"><p>Subtotal: ${formatLKR(num(order.subtotal))}</p>
      ${num(order.discount_amount) > 0 ? `<p>Discount (${escapeHtml(order.coupon_code)}): −${formatLKR(num(order.discount_amount))}</p>` : ""}
      <p>Delivery: ${formatLKR(num(order.delivery_fee))}</p>
      <p><strong>Total: ${formatLKR(num(order.total))}</strong></p>
      ${num(order.advance_deposit) > 0 ? `<p>Deposit paid: −${formatLKR(num(order.advance_deposit))}</p>` : ""}
      ${num(order.refund_amount) > 0 ? `<p>Refunded: −${formatLKR(num(order.refund_amount))}</p>` : ""}</div>
    <div class="cod">COLLECT ON DELIVERY: ${formatLKR(balanceDue)}</div>
    </body></html>`);
  win.document.close();
  return true;
}

export function downloadOrdersCsv(orders: Order[]) {
  const headers = ["Order", "Date", "Customer", "Phone", "City", "District", "Address", "Payment", "Status", "Total (LKR)", "Deposit (LKR)", "To collect (LKR)"];
  const rows = orders.map((o) =>
    [o.order_number, new Date(o.created_at).toISOString().slice(0, 10), o.customer_name, o.phone, o.city, o.district, o.address, o.payment_method, STATUS_LABEL[o.status] ?? o.status, num(o.total), num(o.advance_deposit), getCodBalanceDue(o)]
      .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
      .join(","),
  );
  const url = URL.createObjectURL(new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `almera-orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const ACTIVITY_VERB: Record<string, string> = {
  upsert_product: "Saved product",
  update_order_status: "Updated order",
  record_bank_slip: "Recorded payment",
  refund_order: "Refunded order",
  upsert_coupon: "Saved promo",
  delete_coupon: "Deleted promo",
  delete_product: "Deleted product",
  upsert_category: "Saved category",
  reorder_categories: "Changed category order",
  update_hero: "Updated homepage hero",
  update_gallery: "Updated homepage gallery",
};

export function describeActivity(log: AuditLog) {
  const d = log.details ?? {};
  const name = log.action === "update_hero" ? "" : String(d.order_number ?? (log.action === "delete_product" ? d.name : d.slug) ?? d.code ?? d.name ?? "");
  const verb = ACTIVITY_VERB[log.action] ?? log.action.replace(/_/g, " ");
  let detail = "";
  if (log.action === "update_order_status") {
    detail = `${STATUS_LABEL[String(d.from)] ?? d.from} → ${STATUS_LABEL[String(d.to)] ?? d.to}`;
  } else if (log.action === "record_bank_slip") {
    detail = formatLKR(num(d.depositAmount));
  } else if (log.action === "refund_order") {
    detail = formatLKR(num(d.refunded));
  }
  return { title: `${verb}${name ? ` ${name}` : ""}`, detail };
}
