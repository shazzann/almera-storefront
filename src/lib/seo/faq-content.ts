import {
  DELIVERY,
  FREE_DELIVERY_FROM,
  STITCHING_FEE,
  formatLKR,
  type CategorySlug,
} from "@/lib/catalog";
import { COD_DEPOSIT_THRESHOLD, COD_MIN_DEPOSIT } from "@/lib/cod-deposit";

export type FaqEntry = {
  q: string;
  a: string;
};

export const STORE_FAQS: FaqEntry[] = [
  {
    q: "What’s the difference between stitched and unstitched?",
    a: `Unstitched is the three-piece fabric (shirt, dupatta and trouser) for your own tailor. Stitched means our tailors make it up in a standard size for ${formatLKR(STITCHING_FEE)}, ready in 5–7 days.`,
  },
  {
    q: `Why do Cash on Delivery orders over ${formatLKR(COD_DEPOSIT_THRESHOLD)} require an advance deposit?`,
    a: `For Cash on Delivery orders above ${formatLKR(COD_DEPOSIT_THRESHOLD)}, we ask for a small ${formatLKR(COD_MIN_DEPOSIT)} commitment deposit via bank transfer to confirm dispatch. This amount is deducted from your order total, and you pay the remaining balance in cash to the courier upon delivery.`,
  },
  {
    q: "Can I give my own measurements?",
    a: "Yes. Choose the closest size, then add your measurements in the note at checkout. We’ll confirm them with you before stitching.",
  },
  {
    q: "Are the colours accurate?",
    a: "We photograph in daylight and avoid filters, but screens differ. If colour matters, message us for an unedited photo or video before ordering.",
  },
  {
    q: "How do I know my order went through?",
    a: "You’ll see a confirmation with your order number, and you can check your status anytime on our Track Order page. We’ll also call or WhatsApp you within one working day.",
  },
  {
    q: "Do you restock sold-out pieces?",
    a: "Lawn sometimes comes back. Bridal pieces are usually one of a kind. Follow @almera.lk to hear about restocks first.",
  },
];

export const HOME_FAQS: FaqEntry[] = [
  {
    q: "How long does island-wide delivery take across Sri Lanka?",
    a: `Unstitched and ready-to-wear outfits ship via island-wide courier in ${DELIVERY.standard.eta} across all 25 districts in Sri Lanka. Custom-stitched lawn suits take 5–7 working days before dispatch. Delivery is ${formatLKR(DELIVERY.standard.firstPiece)} for the first piece (${formatLKR(DELIVERY.standard.extraPiece)} per additional piece) and free on orders over ${formatLKR(FREE_DELIVERY_FROM)}.`,
  },
  {
    q: "Are almera Pakistani lawn suits and lehengas 100% original?",
    a: "Yes. Every Pakistani lawn suit, embroidered shalwar kameez, and bridal lehenga in the almera wardrobe is hand-selected for fabric authenticity, embroidery quality, and suitability for Sri Lankan weather.",
  },
  {
    q: "Can I order a 3-piece lawn suit stitched to my size?",
    a: `Yes. Many of our three-piece suits can be ordered either unstitched for your own tailor or stitched by our in-house tailors in sizes M to XXL for an additional ${formatLKR(STITCHING_FEE)}.`,
  },
  {
    q: "What payment methods do you accept in Sri Lanka?",
    a: `We accept Cash on Delivery (COD), Bank Transfer, and online card payments (Visa and MasterCard). For COD orders above ${formatLKR(COD_DEPOSIT_THRESHOLD)}, a ${formatLKR(COD_MIN_DEPOSIT)} advance bank-transfer deposit confirms dispatch and is deducted from your courier balance.`,
  },
];

export type CategorySeoCopy = {
  heading: string;
  paragraphs: string[];
  faqs: FaqEntry[];
};

const DEFAULT_CATEGORY_FAQS: FaqEntry[] = [
  {
    q: "How quickly are orders delivered in Sri Lanka?",
    a: `Ready-to-wear and unstitched pieces arrive within ${DELIVERY.standard.eta} via island-wide courier (${formatLKR(DELIVERY.standard.firstPiece)} for the first piece, free over ${formatLKR(FREE_DELIVERY_FROM)}). Custom-stitched orders take 5–7 days before dispatch.`,
  },
  {
    q: "Can I request unedited daylight videos before purchasing?",
    a: "Yes. Message @almera.lk on Instagram or WhatsApp for unedited daylight photos, fabric close-ups, and sizing advice before placing your order.",
  },
];

export const CATEGORY_SEO_CONTENT: Record<CategorySlug | "all", CategorySeoCopy> = {
  all: {
    heading: "Pakistani Lawn Suits, Shalwar Kameez & Bridal Lehengas in Sri Lanka",
    paragraphs: [
      "Welcome to the complete almera wardrobe — curated piece by piece for women across Sri Lanka who value breathable fabrics, authentic South Asian craftsmanship, and effortless elegance. From everyday cotton, rayon, and muslin kurtis to original Pakistani three-piece lawn suits and hand-embellished bridal lehengas, every outfit is selected in limited quantities.",
      `Choose unstitched fabric for your own tailor or have our tailors stitch your suit to size M–XXL for ${formatLKR(STITCHING_FEE)}. Every order ships island-wide across all 25 Sri Lankan districts in ${DELIVERY.standard.eta}, with free delivery on orders above ${formatLKR(FREE_DELIVERY_FROM)}.`,
    ],
    faqs: HOME_FAQS,
  },
  "day-to-day": {
    heading: "Everyday Cotton, Rayon & Muslin Suits for Sri Lankan Weather",
    paragraphs: [
      "Our Day to Day drawer brings together soft cotton, breathable rayon, and lightweight muslin outfits designed for Colombo heat, office wear, errands, and family visits.",
      `Available ready-to-wear or stitched to size, every piece is delivered island-wide in ${DELIVERY.standard.eta} with Cash on Delivery and bank transfer options.`,
    ],
    faqs: [
      {
        q: "What fabrics are included in the Day to Day collection?",
        a: "The Day to Day collection features breathable cotton, soft rayon, and airy muslin suits chosen specifically for humid tropical weather in Sri Lanka.",
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
  "signature-styles": {
    heading: "Signature Semi-Rich Suits, Hakoba Embroidery & Khushboo Edits",
    paragraphs: [
      "Signature Styles showcases the silhouettes almera is best known for: intricate hakoba eyelet work, semi-rich embroidered ensembles, and refined khushboo pieces for dinners, dawats, and festive gatherings.",
      `Produced in small runs so your outfit stays distinctive, with island-wide courier delivery across Sri Lanka (${formatLKR(DELIVERY.standard.firstPiece)} first piece, free above ${formatLKR(FREE_DELIVERY_FROM)}).`,
    ],
    faqs: [
      {
        q: "Are Signature Styles suits suitable for Eid and festive dinners?",
        a: "Yes. Our semi-rich, hakoba, and khushboo pieces balance statement embroidery with lightweight comfort, making them ideal for Eid, family dinners, and wedding events.",
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
  occasion: {
    heading: "Bridal Lehengas & Festive Occasion Wear for Nikah, Mehndi & Walima",
    paragraphs: [
      "Discover heirloom-worthy bridal lehengas and formal occasion wear in Sri Lanka, curated for the nikah, mehndi, baraat, and walima. Each piece features rich zari, sequin, and zardozi work paired with graceful drapes.",
      "Most bridal and occasion designs are one of a kind. Message us on Instagram (@almera.lk) or WhatsApp for daylight videos and exact measurements before ordering.",
    ],
    faqs: [
      {
        q: "Do you restock bridal lehengas and occasion wear?",
        a: "Most bridal lehengas and occasion pieces are sourced as single or strictly limited editions so your wedding or festive look remains exclusive.",
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
  pakistani: {
    heading: "100% Original Pakistani Lawn & Embroidered Suits in Sri Lanka",
    paragraphs: [
      "Shop authentic Pakistani unstitched and stitched three-piece suits in Sri Lanka. Each set includes an embroidered or printed shirt, matching trouser fabric, and a statement chiffon, organza, or lawn dupatta.",
      `Order your Pakistani suit unstitched (ships in 1–2 working days) or stitched to size M–XXL by our tailors (${formatLKR(STITCHING_FEE)} stitching fee, dispatched in 5–7 days).`,
    ],
    faqs: [
      {
        q: "What comes in a 3-piece Pakistani suit from almera?",
        a: "Each three-piece Pakistani suit includes the shirt fabric (front, back, and sleeves with any neckline/hem borders), 2.5 metres of trouser fabric, and a 2.5-metre matching dupatta.",
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
  casual: {
    heading: "Relaxed Casual Co-ords & Printed Kurtis in Sri Lanka",
    paragraphs: [
      "Easygoing prints, relaxed co-ord sets, and everyday shalwar kameez made for weekends, campus, and casual outings across Sri Lanka.",
      `All casual pieces are in stock in Colombo and ship island-wide within ${DELIVERY.standard.eta}.`,
    ],
    faqs: DEFAULT_CATEGORY_FAQS,
  },
  lawns: {
    heading: "Unstitched & Stitched Pakistani Lawn Suits in Sri Lanka",
    paragraphs: [
      "Breathable printed and embroidered lawn suits tailored for Sri Lanka's tropical climate. Wear them unstitched with your own tailor or choose our in-house stitching service in sizes M to XXL.",
      `Adding custom stitching costs ${formatLKR(STITCHING_FEE)} and takes 5–7 working days before island-wide courier dispatch.`,
    ],
    faqs: [
      {
        q: "Can I buy almera lawn suits either stitched or unstitched?",
        a: `Yes. You can order the 3-piece unstitched fabric for immediate dispatch (1–2 days) or select Stitched in sizes M–XXL for ${formatLKR(STITCHING_FEE)} (ready in 5–7 days).`,
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
  lux: {
    heading: "Lux Hand-Embellished Festive & Couture Pieces",
    paragraphs: [
      "Our Lux drawer features dense hand embellishment, organza and silk drapes, and artisanal detailing for milestone celebrations across Sri Lanka.",
      `Orders over ${formatLKR(FREE_DELIVERY_FROM)} qualify for complimentary island-wide courier delivery across all 25 districts.`,
    ],
    faqs: DEFAULT_CATEGORY_FAQS,
  },
  "ready-to-wear": {
    heading: "Ready-to-Wear Stitched Shalwar Kameez & Festive Outfits",
    paragraphs: [
      "Finished, pressed, and ready to wear the day your parcel arrives. Our Ready to Wear collection includes pre-stitched three-piece suits, embroidered kurtis, and occasion ensembles in standard sizes M to XXL.",
      `Dispatched within 1–2 working days via island-wide courier (${DELIVERY.standard.eta}).`,
    ],
    faqs: [
      {
        q: "What sizes are available in Ready to Wear?",
        a: "Our Ready to Wear outfits are stocked in standard sizes M, L, XL, and XXL. Check the size guide on each product page for exact chest, waist, hip, and length measurements.",
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
  western: {
    heading: "Western Denim Jeans, Jackets & Co-ords in Sri Lanka",
    paragraphs: [
      "Everyday high-waist denim jeans, structured jackets, and western co-ords in waist sizes 26 to 34, selected to pair effortlessly with both kurtis and contemporary tops.",
      `Delivered across Sri Lanka in ${DELIVERY.standard.eta} with Cash on Delivery and bank transfer options.`,
    ],
    faqs: [
      {
        q: "What waist sizes do you carry in Western denim?",
        a: "Our Western denim collection is available in waist sizes 26, 28, 30, 32, and 34. Refer to our Denim Size Guide for waist, hip, and length measurements in inches.",
      },
      ...DEFAULT_CATEGORY_FAQS,
    ],
  },
};

