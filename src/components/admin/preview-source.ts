"use client";

import { categories as storeCategories, categoryGroups, DEFAULT_GALLERY, DEFAULT_HERO, DENIM_SIZES, SIZES, deliveryFee, type Product } from "@/lib/catalog";
import type { AdminData, AdminSource, Order, OrderItem, ProductRow } from "./lib";

/**
 * In-memory stand-in for the real data, for trying the console in development.
 * Nothing here touches the database, the shop's orders or customers' inboxes.
 */
const u = (id: string) => `https://images.unsplash.com/photo-${id}`;
const sample = (slug: string, name: string, categories: Product["categories"], subcategory: string | undefined, colour: string, fabric: string, price: Product["price"], img: string, stock: number, tags: Product["tags"], sizes?: readonly string[]) =>
  ({ slug, name, categories, subcategory, colour, fabric, price, images: [u(img)], pieces: ["Kurta", "Trouser", "Dupatta"], description: `${colour} ${fabric.toLowerCase()} with a soft, easy fall.`, stock, tags, sizes }) as Product;

const storeProducts: Product[] = [
  sample("lilac-chikan-lawn", "Lilac chikan lawn", ["lawns", "pakistani"], undefined, "Lilac", "Lawn", { unstitched: 11450, stitched: 14950 }, "1705920824583-0e783235394d", 3, ["new", "bestseller"]),
  sample("powder-blue-lawn", "Powder blue embroidered lawn", ["lawns", "signature-styles"], "Semi Rich", "Powder blue", "Lawn", { unstitched: 12950, stitched: 16450 }, "1733470381436-bb5a2a441708", 6, ["new"]),
  sample("plum-jacquard-lawn", "Plum jacquard lawn", ["lawns", "lux"], "Semi Rich", "Plum", "Jacquard lawn", { unstitched: 13450, stitched: 16950 }, "1733731402869-57e0cce24aea", 0, []),
  sample("emerald-garden-lawn", "Emerald garden lawn", ["lawns", "casual"], undefined, "Emerald", "Lawn", { unstitched: 9850, stitched: 13350 }, "1597983073750-16f5ded1321f", 8, ["bestseller"]),
  sample("blush-two-piece", "Blush cotton two-piece", ["day-to-day", "casual"], "Cotton", "Blush", "Cotton", { stitched: 9850 }, "1733209484732-6b094322a89f", 7, ["new"]),
  sample("white-muslin-kurta", "White muslin kurta set", ["day-to-day"], "Muslin", "White", "Muslin", { stitched: 10450 }, "1733209590486-4ed0bfcbc52a", 2, []),
  sample("white-hakoba-kurta", "White hakoba kurta set", ["signature-styles"], "Hakoba", "White", "Hakoba cotton", { stitched: 12950 }, "1652953186915-420ae843d1a8", 5, ["bestseller"]),
  sample("jade-tiered-lehenga", "Jade tiered lehenga", ["occasion", "pakistani"], "Lehengas", "Jade", "Raw silk", { stitched: 68500 }, "1619715613791-89d35b51ff81", 2, ["new", "festive"]),
  sample("rose-zardozi-lehenga", "Rose zardozi bridal lehenga", ["occasion", "lux"], "Lehengas", "Rose", "Velvet", { stitched: 145000 }, "1746372283841-dbb3838f9935", 1, ["festive"]),
  sample("classic-straight-jeans", "Classic straight jeans", ["western"], "Denim", "Light wash", "Cotton denim", { stitched: 8950 }, "1598554747436-c9293d6a588f", 8, ["new"], DENIM_SIZES),
];

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const variantRows = (stock: number, sizes: readonly string[], unstitched: boolean, stitched: boolean) => [
  ...(unstitched ? [{ stitching: "unstitched", size: "-", stock: stitched ? Math.ceil(stock / 2) : stock }] : []),
  ...(stitched ? sizes.map((size, i) => ({ stitching: "stitched", size, stock: i === 0 ? Math.floor(stock / 2) : 0 })) : []),
];

const products: ProductRow[] = storeProducts.map((p, i) => {
  const sizes = p.sizes ? [...p.sizes] : [...SIZES];
  return {
    id: `p${i}`,
    slug: p.slug,
    name: p.name,
    categories: p.categories,
    subcategory: p.subcategory ?? null,
    colour: p.colour,
    fabric: p.fabric,
    price_unstitched: p.price.unstitched ?? null,
    price_stitched: p.price.stitched ?? null,
    was_price_unstitched: p.wasPrice?.unstitched ?? null,
    was_price_stitched: p.wasPrice?.stitched ?? null,
    images: p.images,
    pieces: p.pieces,
    sizes,
    tags: p.tags,
    description: p.description,
    care: p.care ?? null,
    stock: p.stock,
    is_active: true,
    is_featured: i === 1,
    product_variants: variantRows(p.stock, sizes, p.price.unstitched != null, p.price.stitched != null),
  };
});

const item = (slugIndex: number, qty = 1, size = "M"): OrderItem => {
  const p = products[slugIndex % products.length];
  return {
    id: `i${slugIndex}-${size}`,
    product_slug: p.slug,
    product_name: p.name,
    stitching: p.price_stitched != null ? "stitched" : "unstitched",
    size,
    unit_price: Number(p.price_stitched ?? p.price_unstitched),
    quantity: qty,
    image_url: p.images[0],
  };
};

function order(n: number, status: string, h: number, name: string, phone: string, city: string, district: string, items: OrderItem[], extra: Partial<Order> = {}): Order {
  const subtotal = items.reduce((sum, it) => sum + Number(it.unit_price) * Number(it.quantity), 0);
  const delivery = subtotal >= 25000 ? 0 : deliveryFee(items.reduce((n, it) => n + Number(it.quantity), 0));
  return {
    id: `o${n}`,
    order_number: `ALM-${10240 + n}`,
    customer_name: name,
    phone,
    email: `${name.split(" ")[0].toLowerCase()}@example.com`,
    address: `${10 + n} Station Road`,
    city,
    district,
    payment_method: "cod",
    status,
    subtotal,
    delivery_fee: delivery,
    total: subtotal + delivery,
    created_at: hoursAgo(h),
    order_items: items,
    ...extra,
  };
}

const orders: Order[] = [
  order(9, "pending", 0.4, "Shifana Rizvi", "077 123 4501", "Kandy", "Kandy", [item(0), item(9)]),
  order(8, "pending", 2, "Rizna Farook", "071 555 0102", "Dehiwala", "Colombo", [item(8)], { notes: "Please deliver after 4 pm." }),
  order(7, "awaiting_bank_slip", 5, "Aathika Nazeer", "076 222 8103", "Batticaloa", "Batticaloa", [item(17)], { payment_method: "bank" }),
  order(6, "confirmed", 20, "Hafsa Ibrahim", "075 310 2204", "Galle", "Galle", [item(1, 2)], { advance_deposit: 500, bank_slip_reference: "HNB-849201" }),
  order(5, "confirmed", 28, "Nimra Hassan", "078 410 7705", "Negombo", "Gampaha", [item(12)], { payment_method: "card" }),
  order(4, "shipped", 50, "Sara Mohamed", "077 900 1206", "Matara", "Matara", [item(3), item(10)], { advance_deposit: 500 }),
  order(3, "delivered", 74, "Zahra Ali", "072 118 3307", "Jaffna", "Jaffna", [item(11)]),
  order(2, "delivered", 100, "Maryam Khan", "070 662 5508", "Kalmunai", "Ampara", [item(2)], { advance_deposit: 500 }),
  order(1, "cancelled", 130, "Fathima Nihla", "077 441 0009", "Kurunegala", "Kurunegala", [item(4)]),
];

const data: AdminData = {
  hero: DEFAULT_HERO,
  gallery: DEFAULT_GALLERY,
  products,
  orders,
  categories: storeCategories.map((c, i) => ({
    id: `c${i}`,
    slug: c.slug,
    name: c.name,
    nav_group: (categoryGroups.find((g) => g.slugs.includes(c.slug))?.title ?? "Everyday") as "Everyday" | "Special" | "More",
    subcategories: c.subcategories ?? [],
    description: c.blurb,
    image_url: c.image,
    sort_order: i + 1,
    is_active: true,
  })),
  coupons: [
    { id: "k1", code: "EID20", discount_type: "percentage", discount_value: 20, min_order_value: 10000, max_discount_amount: 5000, max_uses: 100, used_count: 34, is_active: true, is_public: true, expires_at: hoursAgo(-24 * 12) },
    { id: "k2", code: "FREESHIP", discount_type: "free_delivery", discount_value: 0, min_order_value: 15000, used_count: 12, is_active: true, is_public: true },
    { id: "k3", code: "SARA1000", discount_type: "fixed", discount_value: 1000, min_order_value: 0, used_count: 7, is_active: false, is_public: false },
  ],
  auditLogs: [
    { id: "a1", action: "update_order_status", entity_type: "order", details: { order_number: "ALM-10246", from: "pending", to: "confirmed" }, created_at: hoursAgo(1) },
    { id: "a2", action: "record_bank_slip", entity_type: "order", details: { order_number: "ALM-10246", depositAmount: 500 }, created_at: hoursAgo(1.1) },
    { id: "a3", action: "upsert_product", entity_type: "product", details: { slug: "lilac-chikan-lawn-3-piece" }, created_at: hoursAgo(6) },
  ],
};

const pause = () => new Promise((r) => setTimeout(r, 350));
const clone = () => structuredClone(data);

export const previewSource: AdminSource = {
  async open() {
    await pause();
    return { ok: true, email: "preview@almera.lk", data: clone() };
  },
  async load() {
    await pause();
    return clone();
  },
  async saveProduct({ colour_of, ...p }) {
    await pause();
    const source = data.products.find((x) => x.slug === colour_of);
    if (source) source.colour_group ??= `group-${source.slug}`;
    const row: ProductRow = {
      ...p,
      id: p.id ?? `p${Date.now()}`,
      colour_group: source?.colour_group ?? data.products.find((x) => x.slug === p.slug)?.colour_group,
      product_variants: [
        ...(p.unstitched_stock != null ? [{ stitching: "unstitched", size: "-", stock: p.unstitched_stock }] : []),
        ...Object.entries(p.size_stocks ?? {}).map(([size, stock]) => ({ stitching: "stitched", size, stock })),
      ],
    };
    const i = data.products.findIndex((x) => x.slug === p.slug);
    if (i >= 0) data.products[i] = row;
    else data.products.unshift(row);
  },
  async setOrderStatus(id, next) {
    await pause();
    const o = data.orders.find((x) => x.id === id);
    if (o) o.status = next;
  },
  async recordDeposit({ orderId, depositAmount, slipReference, depositNote, confirmOrder }) {
    await pause();
    const o = data.orders.find((x) => x.id === orderId);
    if (!o) return;
    o.advance_deposit = depositAmount;
    o.bank_slip_reference = slipReference || null;
    o.advance_deposit_note = depositNote || null;
    if (confirmOrder) o.status = "confirmed";
  },
  async refund({ orderId, refundAmount, reason }) {
    await pause();
    const o = data.orders.find((x) => x.id === orderId);
    if (!o) return;
    o.refund_amount = Number(o.refund_amount ?? 0) + refundAmount;
    o.refund_reason = reason;
    o.status = Number(o.refund_amount) >= Number(o.total) ? "refunded" : "partially_refunded";
  },
  async saveCoupon(c) {
    await pause();
    const i = data.coupons.findIndex((x) => x.code === c.code);
    if (i >= 0) data.coupons[i] = { ...data.coupons[i], ...c };
    else data.coupons.unshift({ ...c, id: `k${Date.now()}`, used_count: 0 });
  },
  async deleteProduct(id) {
    await pause();
    data.products = data.products.filter((p) => p.id !== id);
  },
  async deleteCoupon(id) {
    await pause();
    data.coupons = data.coupons.filter((c) => c.id !== id);
  },
  async saveCategory(c) {
    await pause();
    const i = data.categories.findIndex((x) => x.slug === c.slug);
    if (i >= 0) data.categories[i] = c;
    else data.categories.push(c);
  },
  async reorderCategories(slugs) {
    await pause();
    data.categories = slugs.flatMap((slug, i) => {
      const c = data.categories.find((x) => x.slug === slug);
      return c ? [{ ...c, sort_order: i + 1 }] : [];
    });
  },
  async saveHero(hero) {
    await pause();
    data.hero = hero;
  },
  async saveGallery(gallery) {
    await pause();
    data.gallery = gallery;
  },
  async uploadImage(file) {
    await pause();
    return URL.createObjectURL(file);
  },
  async signOut() {},
};
