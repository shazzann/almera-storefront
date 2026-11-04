import { buildImageUrl } from "./image-url";

export type CategorySlug =
  | "day-to-day"
  | "signature-styles"
  | "occasion"
  | "pakistani"
  | "casual"
  | "lawns"
  | "lux"
  | "ready-to-wear"
  | "western";
export type Stitching = "unstitched" | "stitched";

export type Category = {
  slug: CategorySlug;
  name: string;
  blurb: string;
  image: string;
  /** Tap-to-filter chips on the category page, matched against Product.subcategory. */
  subcategories?: string[];
  /** Column in the desktop Shop menu, chosen by the owner. */
  group?: string;
};

export type Product = {
  slug: string;
  name: string;
  /** First entry is the home category, used for breadcrumbs and "more from". Ready to Wear is worked out automatically. */
  categories: CategorySlug[];
  subcategory?: string;
  colour: string;
  fabric: string;
  /** Price per stitching option, in LKR. A product offers only the options listed here. */
  price: Partial<Record<Stitching, number>>;
  /** Price before markdown, keyed the same way. */
  wasPrice?: Partial<Record<Stitching, number>>;
  images: string[];
  pieces: string[];
  description: string;
  stock: number;
  /** Stock count specifically for the unstitched 3-piece fabric option, when tracked per variant. */
  unstitchedStock?: number;
  /** Stock count per stitched size (e.g. { XS: 2, S: 3, M: 0, L: 1, XL: 2 } or { "26": 2, "28": 4, ... }). */
  sizeStock?: Record<string, number>;
  tags: ("new" | "bestseller" | "festive")[];
  /** Overrides the standard M–XXL sizes, and switches the size guide to the denim chart. */
  sizes?: readonly string[];
  care?: string;
  /** Shared by the listings that are colours of one item. */
  colourGroup?: string;
};

/** Fixed site photos, stored on our CDN under their original photo ids. */
const u = (id: string) => buildImageUrl(`site/${id}.webp`);

export const texture = {
  goldThread: u("1763400234383-8b9ecbb9c043"),
  zardozi: u("1724856605022-106d6dd6e842"),
  chikan: u("1720982892402-5380e855320c"),
  fabricStack: u("1717585679395-bbe39b5fb6bc"),
  dupatta: u("1717586756136-d9a3eeb1fa6f"),
  bloom: u("1720982018719-f2666caf447a"),
};

export const editorial = {
  hero: u("1619715613791-89d35b51ff81"),
  courtyard: u("1733209484732-6b094322a89f"),
  courtyardBench: u("1747847471517-952a3eb93a89"),
  bridal: u("1746372283841-dbb3838f9935"),
};

export const SIZES = ["M", "L", "XL", "XXL"] as const;
export const DENIM_SIZES = ["26", "28", "30", "32", "34"] as const;
export type Size = string;

/** Flat charge for stitching an unstitched suit, shown as the difference between options. */
export const STITCHING_FEE = 3500;
export const FREE_DELIVERY_FROM = 25000;

export const categories: Category[] = [
  {
    slug: "day-to-day",
    name: "Day to Day",
    blurb: "Easy cotton, rayon and muslin for work, errands and everything in between. Soft, breathable and made to be worn often.",
    image: u("1745313452052-0e4e341f326c"),
    subcategories: ["Cotton", "Rayon", "Muslin"],
  },
  {
    slug: "signature-styles",
    name: "Signature Styles",
    blurb: "The pieces almera is known for: semi-rich suits, hakoba embroidery and khushboo, for when you want to look a little more dressed.",
    image: u("1652953186915-420ae843d1a8"),
    subcategories: ["Semi Rich", "Hakoba", "Khushboo"],
  },
  {
    slug: "occasion",
    name: "Occasion",
    blurb: "Premium festive and occasion wear, from Eid suits to lehengas for the nikah, the mehndi and the walima.",
    image: u("1746372283841-dbb3838f9935"),
    subcategories: ["Lehengas"],
  },
  {
    slug: "pakistani",
    name: "Pakistani",
    blurb: "Lawn, embroidered suits and bridal wear from Pakistan, chosen piece by piece and delivered across Sri Lanka.",
    image: u("1705920824583-0e783235394d"),
  },
  {
    slug: "casual",
    name: "Casual",
    blurb: "Relaxed prints and easy co-ords for days out, visits and weekends.",
    image: u("1764928947261-f5687e0faa4a"),
  },
  {
    slug: "lawns",
    name: "Lawns",
    blurb: "Breathable printed and embroidered lawn, made for Sri Lankan heat. Buy the three-piece unstitched or have us stitch it to your size.",
    image: u("1597983073750-16f5ded1321f"),
  },
  {
    slug: "lux",
    name: "Lux",
    blurb: "Our finest pieces, with rich fabrics and dense hand embellishment. Most are one of a kind.",
    image: u("1747847471517-952a3eb93a89"),
  },
  {
    slug: "ready-to-wear",
    name: "Ready to Wear",
    blurb: "Finished outfits, pressed and packed. Wear them the day they arrive.",
    image: u("1733209484732-6b094322a89f"),
  },
  {
    slug: "western",
    name: "Western",
    blurb: "Denim that goes with everything, from everyday jeans to jackets and co-ords.",
    image: u("1760624294535-40dfdc84a48f"),
    subcategories: ["Denim"],
  },
];

/** How the categories are grouped in the desktop Shop menu. */
export const categoryGroups: { title: string; slugs: CategorySlug[] }[] = [
  { title: "Everyday", slugs: ["day-to-day", "casual", "lawns"] },
  { title: "Special", slugs: ["signature-styles", "occasion", "lux"] },
  { title: "More", slugs: ["pakistani", "ready-to-wear", "western"] },
];

/** Splits an ordered list into the Shop menu columns, keeping its order inside each column. */
export function groupCategories(list: Category[]) {
  const groupOf = (c: Category) =>
    c.group ?? categoryGroups.find((g) => g.slugs.includes(c.slug))?.title ?? categoryGroups[0].title;
  return categoryGroups.map((g) => ({ title: g.title, items: list.filter((c) => groupOf(c) === g.title) }));
}

/** Tells linked colours apart in the bag and on orders, unless the name already says the colour. */
export function nameWithColour(p: { name: string; colour: string; colourGroup?: string | null }) {
  const colour = p.colour.trim();
  if (!p.colourGroup || !colour || p.name.toLowerCase().includes(colour.toLowerCase())) return p.name;
  return `${p.name} (${colour})`;
}

/** The other listings of this item, in an order that stays the same from page to page. */
export function colourOptions(product: Product, all: Product[]) {
  if (!product.colourGroup) return [];
  const options = all.filter((p) => p.colourGroup === product.colourGroup);
  return options.length > 1 ? options.sort((a, b) => a.colour.localeCompare(b.colour)) : [];
}

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function inCategory(p: Product, slug: CategorySlug) {
  // Ready to Wear is every finished outfit: sold stitched only, and not Western.
  if (slug === "ready-to-wear") return p.price.unstitched == null && !p.categories.includes("western");
  return p.categories.includes(slug);
}

export function startingPrice(p: Product) {
  const vals = Object.values(p.price).filter((v): v is number => typeof v === "number");
  return vals.length > 0 ? Math.min(...vals) : 0;
}

export function stitchingOptions(p: Product): Stitching[] {
  return (["unstitched", "stitched"] as const).filter((s) => p.price[s] != null);
}

/**
 * Returns the available stock for a specific stitching option and size.
 * - For "unstitched": returns `p.unstitchedStock` if variant tracking is active, else `p.stock`.
 * - For "stitched" with a specific `size`: returns `p.sizeStock[size]` if variant tracking is active, else `p.stock`.
 * - For "stitched" without a `size`: returns the sum of all stitched size stocks, else `p.stock`.
 */
export function getOptionStock(p: Product, stitching: Stitching, size?: Size | null): number {
  if (stitching === "unstitched") {
    if (typeof p.unstitchedStock === "number") return Math.max(0, p.unstitchedStock);
    return Math.max(0, p.stock);
  }
  if (p.sizeStock) {
    if (size) {
      return Math.max(0, Number(p.sizeStock[size] ?? 0));
    }
    return Object.values(p.sizeStock).reduce((sum, n) => sum + Math.max(0, Number(n ?? 0)), 0);
  }
  return Math.max(0, p.stock);
}

export const formatLKR = (n: number) => `Rs. ${n.toLocaleString("en-LK")}`;

export const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya", "Galle", "Matara", "Hambantota",
  "Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla", "Monaragala", "Ratnapura", "Kegalle",
];

export const DELIVERY = {
  standard: { label: "Island-wide courier", eta: "2–4 working days", firstPiece: 550, extraPiece: 100 },
} as const;
export type DeliveryMethod = keyof typeof DELIVERY;

/** The first piece in an order costs the full fee, and each piece after it adds a smaller one. */
export function deliveryFee(pieces: number, method: DeliveryMethod = "standard") {
  if (pieces <= 0) return 0;
  const { firstPiece, extraPiece } = DELIVERY[method];
  return firstPiece + extraPiece * (pieces - 1);
}

export type HeroSettings = {
  /** The product on the cover. Null means the newest product. */
  productSlug: string | null;
  /** Which of that product's photos to show. Null means its first photo. */
  imageUrl: string | null;
  /** The small line above the headline. Empty hides it. */
  seasonText: string;
};

export const HERO_SEASON_MAX = 48;

export const DEFAULT_HERO: HeroSettings = {
  productSlug: null,
  imageUrl: null,
  seasonText: "Eid & wedding season · 2026",
};

/** A hidden or removed cover falls back to the newest product, so the hero never breaks. */
export function resolveHero(products: Product[], hero: HeroSettings) {
  const chosen = products.find((p) => p.slug === hero.productSlug);
  const cover = chosen ?? products[0];
  const image = chosen && hero.imageUrl && chosen.images.includes(hero.imageUrl) ? hero.imageUrl : cover?.images[0];
  return { cover, image };
}

export const GALLERY_SIZE = 6;

export type GallerySettings = {
  /** One entry per photo on the homepage. Null keeps the automatic photo for that spot. */
  tiles: (string | null)[];
};

export const DEFAULT_GALLERY: GallerySettings = { tiles: Array<string | null>(GALLERY_SIZE).fill(null) };

/** Always returns a full row, so the homepage grid never has gaps. */
export function galleryTiles(productPhotos: (string | undefined)[], gallery: GallerySettings) {
  const automatic = [
    texture.goldThread,
    productPhotos[0] ?? texture.zardozi,
    texture.dupatta,
    productPhotos[1] ?? texture.chikan,
    texture.bloom,
    productPhotos[2] ?? texture.fabricStack,
  ];
  return automatic.map((photo, i) => gallery.tiles[i] ?? photo);
}
