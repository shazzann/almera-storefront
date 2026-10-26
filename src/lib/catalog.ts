// Demo catalogue. Photography is stock imagery from Unsplash standing in for
// almera's own shoots; names, prices and stock levels are placeholders.

export type CategorySlug = "lawn" | "shalwar-kameez" | "lehengas";
export type Stitching = "unstitched" | "stitched";

export type Category = {
  slug: CategorySlug;
  name: string;
  short: string;
  blurb: string;
  image: string;
};

export type Product = {
  slug: string;
  name: string;
  category: CategorySlug;
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
  tags: ("new" | "bestseller" | "festive")[];
};

const u = (id: string) => `https://images.unsplash.com/photo-${id}`;

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
  courtyard: u("1786596552158-fb0aa2d260ba"),
  courtyardBench: u("1786596552096-c782a23e00b3"),
  bridal: u("1746372283841-dbb3838f9935"),
};

export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type Size = (typeof SIZES)[number];

/** Flat charge for stitching an unstitched suit, shown as the difference between options. */
export const STITCHING_FEE = 3500;
export const FREE_DELIVERY_FROM = 25000;

export const categories: Category[] = [
  {
    slug: "lawn",
    name: "Lawn suits",
    short: "Lawn",
    blurb:
      "Breathable printed and embroidered lawn from Pakistan's favourite labels, made for Sri Lankan heat. Buy the three-piece unstitched or have us stitch it to your size.",
    image: u("1705920824583-0e783235394d"),
  },
  {
    slug: "shalwar-kameez",
    name: "Shalwar kameez",
    short: "Shalwar kameez",
    blurb:
      "Ready-to-wear kurtas, co-ords and shalwar sets. Pressed, packed and ready to wear the day they arrive.",
    image: u("1733209484732-6b094322a89f"),
  },
  {
    slug: "lehengas",
    name: "Lehengas",
    short: "Lehengas",
    blurb:
      "Bridal, walima and mehndi lehengas with hand embellishment. Every piece is checked by hand before it leaves us.",
    image: u("1746372283841-dbb3838f9935"),
  },
];

const lawn3 = ["Embroidered shirt front, 1.25 m", "Printed back & sleeves, 1.75 m", "Printed chiffon dupatta, 2.5 m", "Dyed cambric trouser, 2.5 m"];
const pret2 = ["Kurta", "Straight trouser"];
const pret3 = ["Kurta", "Trouser", "Dupatta"];
const lehenga = ["Lehenga skirt with can-can", "Embellished choli", "Net dupatta"];

export const products: Product[] = [
  // Lawn
  {
    slug: "lilac-chikan-lawn-3-piece",
    name: "Lilac chikan lawn",
    category: "lawn",
    colour: "Lilac",
    fabric: "Lawn with chikankari front",
    price: { unstitched: 11450, stitched: 14950 },
    images: [u("1705920824583-0e783235394d"), texture.chikan],
    pieces: lawn3,
    description:
      "Soft lilac lawn with tonal chikankari down the front and scalloped sleeves, finished with a feather-light chiffon dupatta.",
    stock: 3,
    tags: ["new", "bestseller"],
  },
  {
    slug: "powder-blue-embroidered-lawn",
    name: "Powder blue embroidered lawn",
    category: "lawn",
    colour: "Powder blue",
    fabric: "Premium lawn",
    price: { unstitched: 12950, stitched: 16450 },
    images: [u("1733470381436-bb5a2a441708"), texture.bloom],
    pieces: lawn3,
    description:
      "A cool powder blue with white thread embroidery on the yoke and hem. Light enough for a day of Eid visits.",
    stock: 6,
    tags: ["new", "festive"],
  },
  {
    slug: "plum-jacquard-lawn",
    name: "Plum jacquard lawn",
    category: "lawn",
    colour: "Plum",
    fabric: "Jacquard lawn",
    price: { unstitched: 13450, stitched: 16950 },
    images: [u("1733731402869-57e0cce24aea"), texture.dupatta],
    pieces: lawn3,
    description:
      "Deep plum jacquard with a woven self-print and an organza-edged dupatta. Dressy enough for evenings.",
    stock: 4,
    tags: ["festive"],
  },
  {
    slug: "emerald-garden-lawn",
    name: "Emerald garden lawn",
    category: "lawn",
    colour: "Emerald & coral",
    fabric: "Digital-print lawn",
    price: { unstitched: 9850, stitched: 13350 },
    images: [u("1597983073750-16f5ded1321f"), texture.bloom],
    pieces: lawn3,
    description:
      "A coral garden print over a long shirt, paired with emerald trousers and a contrast dupatta.",
    stock: 8,
    tags: ["bestseller"],
  },
  {
    slug: "ash-grey-lawn-black-dupatta",
    name: "Ash grey lawn, black dupatta",
    category: "lawn",
    colour: "Ash grey",
    fabric: "Lawn with embroidered chiffon",
    price: { unstitched: 12450, stitched: 15950 },
    wasPrice: { unstitched: 14450, stitched: 17950 },
    images: [u("1773439878338-c61b0fe9ed48"), u("1773439878281-5aa23c34dcaa")],
    pieces: lawn3,
    description:
      "A quiet grey shirt against a black chiffon dupatta worked in silver thread.",
    stock: 2,
    tags: ["new"],
  },
  {
    slug: "scarlet-printed-lawn",
    name: "Scarlet printed lawn",
    category: "lawn",
    colour: "Scarlet",
    fabric: "Printed lawn",
    price: { unstitched: 8950, stitched: 12450 },
    images: [u("1759840278381-bf7d5e332050"), u("1759840278862-ef629e9b0f64")],
    pieces: lawn3,
    description:
      "Bright scarlet with an ivory neckline panel and a floral printed dupatta.",
    stock: 0,
    tags: [],
  },
  {
    slug: "cobalt-everyday-lawn",
    name: "Cobalt everyday lawn",
    category: "lawn",
    colour: "Cobalt",
    fabric: "Printed lawn",
    price: { unstitched: 8450, stitched: 11950 },
    images: [u("1780247723311-2dae151784d1"), texture.fabricStack],
    pieces: lawn3,
    description:
      "An easy cobalt print with a contrast dupatta. Made for everyday wear.",
    stock: 10,
    tags: [],
  },
  {
    slug: "fuchsia-summer-lawn",
    name: "Fuchsia summer lawn",
    category: "lawn",
    colour: "Fuchsia",
    fabric: "Lawn",
    price: { unstitched: 9450, stitched: 12950 },
    images: [u("1776436817748-f8e10a7e75b0"), texture.dupatta],
    pieces: lawn3,
    description: "A saturated fuchsia with self-embroidered cuffs and a matching dupatta.",
    stock: 5,
    tags: ["new"],
  },

  // Shalwar kameez (ready to wear)
  {
    slug: "blush-two-piece",
    name: "Blush cotton two-piece",
    category: "shalwar-kameez",
    colour: "Blush",
    fabric: "Cotton",
    price: { stitched: 9850 },
    images: [u("1733209484732-6b094322a89f"), texture.chikan],
    pieces: pret2,
    description:
      "A relaxed blush kurta with pintucks at the yoke, over straight trousers. Cool cotton for long days.",
    stock: 7,
    tags: ["new", "bestseller"],
  },
  {
    slug: "white-mul-kurta-set",
    name: "White mul kurta set",
    category: "shalwar-kameez",
    colour: "White",
    fabric: "Mul cotton",
    price: { stitched: 10450 },
    images: [u("1733209590486-4ed0bfcbc52a"), texture.chikan],
    pieces: pret2,
    description: "A crisp white mul kurta with cutwork hem and matching trousers.",
    stock: 4,
    tags: ["bestseller"],
  },
  {
    slug: "block-print-kurta-pajama",
    name: "Block print kurta & pajama",
    category: "shalwar-kameez",
    colour: "Ivory & rust",
    fabric: "Hand block-printed cotton",
    price: { stitched: 11250 },
    images: [u("1745313452052-0e4e341f326c"), texture.bloom],
    pieces: pret2,
    description: "Rust florals block-printed by hand on ivory cotton. The pajama has a drawstring waist.",
    stock: 6,
    tags: ["new"],
  },
  {
    slug: "rose-floral-co-ord",
    name: "Rose floral co-ord",
    category: "shalwar-kameez",
    colour: "Rose",
    fabric: "Cotton voile",
    price: { stitched: 9450 },
    images: [u("1741847639057-b51a25d42892"), texture.dupatta],
    pieces: pret2,
    description: "A rose voile kurta and pants with a small floral print and a tie neck.",
    stock: 9,
    tags: [],
  },
  {
    slug: "tea-pink-bow-set",
    name: "Tea pink bow set",
    category: "shalwar-kameez",
    colour: "Tea pink",
    fabric: "Printed cambric",
    price: { stitched: 8950 },
    images: [u("1762777777819-4d9aa5529368"), texture.bloom],
    pieces: pret2,
    description: "A soft printed cambric co-ord with a bow at the neck.",
    stock: 5,
    tags: ["new"],
  },
  {
    slug: "garden-print-co-ord",
    name: "Garden print co-ord",
    category: "shalwar-kameez",
    colour: "Sage & blush",
    fabric: "Lawn",
    price: { stitched: 10950 },
    images: [u("1764928947261-f5687e0faa4a"), texture.bloom],
    pieces: pret2,
    description: "A botanical print on breathable lawn. The kurta has side slits and hidden pockets.",
    stock: 3,
    tags: ["bestseller"],
  },
  {
    slug: "paisley-print-set",
    name: "Paisley print set",
    category: "shalwar-kameez",
    colour: "Multi",
    fabric: "Viscose",
    price: { stitched: 11950 },
    images: [u("1765529374927-052599af9c82"), texture.dupatta],
    pieces: pret3,
    description: "A fluid viscose three-piece with a matching printed dupatta.",
    stock: 6,
    tags: [],
  },
  {
    slug: "bagh-print-set",
    name: "Bagh print set",
    category: "shalwar-kameez",
    colour: "Indigo & red",
    fabric: "Cotton",
    price: { stitched: 10250 },
    images: [u("1767785829347-cc13bd969514"), texture.fabricStack],
    pieces: pret2,
    description: "A bold bagh print kurta with a mandarin collar and a piped placket.",
    stock: 4,
    tags: ["new"],
  },
  {
    slug: "maroon-chikankari-kurta",
    name: "Maroon chikankari kurta",
    category: "shalwar-kameez",
    colour: "Maroon",
    fabric: "Georgette with chikankari",
    price: { stitched: 13950 },
    images: [u("1708534246055-d7b149acb731"), texture.chikan],
    pieces: pret3,
    description: "Deep maroon georgette with white chikankari, worn with a matching slip and trousers.",
    stock: 2,
    tags: ["festive"],
  },

  // Lehengas
  {
    slug: "jade-tiered-lehenga",
    name: "Jade tiered lehenga",
    category: "lehengas",
    colour: "Jade",
    fabric: "Raw silk & organza",
    price: { stitched: 68500 },
    images: [u("1619715613791-89d35b51ff81"), texture.goldThread],
    pieces: lehenga,
    description:
      "Three tiers of jade organza over raw silk with a gota-edged hem. Made for mehndi nights and photographs.",
    stock: 2,
    tags: ["new", "festive"],
  },
  {
    slug: "rose-zardozi-bridal-lehenga",
    name: "Rose zardozi bridal lehenga",
    category: "lehengas",
    colour: "Rose & teal",
    fabric: "Velvet & net",
    price: { stitched: 145000 },
    images: [u("1746372283841-dbb3838f9935"), texture.zardozi],
    pieces: lehenga,
    description:
      "A rose bridal lehenga with dense zardozi panels, a teal choli and a scalloped net dupatta.",
    stock: 1,
    tags: ["festive", "bestseller"],
  },
  {
    slug: "marigold-maroon-lehenga",
    name: "Marigold & maroon lehenga",
    category: "lehengas",
    colour: "Marigold",
    fabric: "Silk with mirrorwork",
    price: { stitched: 92500 },
    images: [u("1767955694884-d4bf352c23c2"), texture.goldThread],
    pieces: lehenga,
    description: "Marigold silk bordered in maroon, with mirrorwork that catches the light.",
    stock: 2,
    tags: ["festive"],
  },
  {
    slug: "lilac-garden-lehenga",
    name: "Lilac garden lehenga",
    category: "lehengas",
    colour: "Lilac",
    fabric: "Net with sequins",
    price: { stitched: 74500 },
    images: [u("1649930055986-ca57250a7fd4"), texture.bloom],
    pieces: lehenga,
    description: "A lilac net lehenga scattered with tonal sequins, for nikah or walima.",
    stock: 3,
    tags: ["new"],
  },
  {
    slug: "crimson-mughal-bridal",
    name: "Crimson Mughal bridal",
    category: "lehengas",
    colour: "Crimson",
    fabric: "Velvet with dabka",
    price: { stitched: 165000 },
    images: [u("1707576618343-26a1b377ca7a"), texture.zardozi],
    pieces: lehenga,
    description: "A classic crimson bridal with Mughal arches in dabka and tilla. Comes with a double dupatta.",
    stock: 1,
    tags: ["festive"],
  },
  {
    slug: "peacock-embroidered-lehenga",
    name: "Peacock embroidered lehenga",
    category: "lehengas",
    colour: "Peacock blue",
    fabric: "Raw silk",
    price: { stitched: 118000 },
    images: [u("1747847471517-952a3eb93a89"), u("1747847471528-7b95ea7a4c39"), u("1747847472156-82c4cf8338c8")],
    pieces: lehenga,
    description: "Peacock blue raw silk with antique gold embroidery from waist to hem.",
    stock: 2,
    tags: ["new", "bestseller"],
  },
  {
    slug: "midnight-mirrorwork-lehenga",
    name: "Midnight mirrorwork lehenga",
    category: "lehengas",
    colour: "Black",
    fabric: "Georgette with mirrorwork",
    price: { stitched: 58500 },
    wasPrice: { stitched: 66000 },
    images: [u("1716504628204-47f2df8d2634"), texture.goldThread],
    pieces: lehenga,
    description: "A black georgette lehenga with mirrorwork and a cropped choli, for sangeet and receptions.",
    stock: 4,
    tags: [],
  },
  {
    slug: "ivory-gold-lehenga",
    name: "Ivory & gold lehenga",
    category: "lehengas",
    colour: "Ivory & saffron",
    fabric: "Organza",
    price: { stitched: 64500 },
    images: [u("1701252072712-e939599623f2"), texture.goldThread],
    pieces: lehenga,
    description: "An ivory organza skirt with a gold border and a saffron dupatta.",
    stock: 3,
    tags: ["festive"],
  },
];

export function getCategory(slug: string) {
  return categories.find((c) => c.slug === slug);
}

export function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export function productsIn(category: CategorySlug) {
  return products.filter((p) => p.category === category);
}

export function startingPrice(p: Product) {
  return Math.min(...Object.values(p.price));
}

export function stitchingOptions(p: Product): Stitching[] {
  return (["unstitched", "stitched"] as const).filter((s) => p.price[s] != null);
}

export function related(p: Product, count = 4) {
  return products.filter((x) => x.category === p.category && x.slug !== p.slug).slice(0, count);
}

export const formatLKR = (n: number) => `Rs. ${n.toLocaleString("en-LK")}`;

export const DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya", "Galle", "Matara", "Hambantota",
  "Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu", "Batticaloa", "Ampara", "Trincomalee",
  "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla", "Monaragala", "Ratnapura", "Kegalle",
];

export const DELIVERY = {
  standard: { label: "Island-wide courier", eta: "2–4 working days", fee: 450 },
  express: { label: "Colombo next-day", eta: "Order by 2 pm", fee: 850 },
} as const;
export type DeliveryMethod = keyof typeof DELIVERY;
