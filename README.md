# almera storefront: design prototype

A front-end prototype of an online store for **almera, The Desi Wardrobe** ([@almera.lk](https://www.instagram.com/almera.lk/)), a Sri Lankan Instagram boutique selling Pakistani lawn suits, shalwar kameez and lehengas.

Built with Next.js 16 (App Router, Cache Components) and Tailwind CSS 4. Every page is prerendered to static HTML, with per-page metadata, Product JSON-LD, a sitemap and robots.txt for SEO.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. For the client meeting, open it on a phone or use the browser's mobile view, since most of their customers shop on mobile.

## What's in the prototype

| Page | Route |
| --- | --- |
| Home, with the wardrobe-door hero | `/` |
| Shop all, with filters and sort | `/shop` |
| Category pages | `/shop/day-to-day`, `/shop/signature-styles`, `/shop/occasion`, `/shop/pakistani`, `/shop/casual`, `/shop/lawns`, `/shop/lux`, `/shop/ready-to-wear`, `/shop/western` |
| Product page (stitched/unstitched, sizes, size guide) | `/product/[slug]` |
| Bag drawer | any page, via the bag icon |
| Checkout (COD / bank transfer, Sri Lankan districts) | `/checkout` |
| Order confirmation | `/order-confirmed` |
| Our story, Help (delivery, sizing, policy, FAQ), Contact | `/about`, `/help`, `/contact` |

## Design notes

- **Palette** is taken from almera's logo: sage `#9db7a8`, olive `#5e5c30`, gold `#a9813f`, ivory `#faf8f2`, bark `#5b3d2a`. Tokens live in `src/app/globals.css`.
- **Type:** Bodoni Moda in lowercase, echoing the logo's wordmark, with Hanken Grotesk for body text.
- **Signature:** the arched wardrobe from the logo. Product images sit in arch frames, and the homepage hero opens like wardrobe doors on load (turned off for visitors who prefer reduced motion).

## Placeholder content to replace before launch

- **Photos** are free Unsplash stock images loaded from Unsplash's CDN (`src/lib/image-loader.ts`). Replace them with almera's own shoots.
- **Products, prices, stock, delivery fees**, the free-delivery threshold, the stitching fee and the size chart are all sample data in `src/lib/catalog.ts` and `src/components/size-guide.tsx`.
- **Client reviews** on the homepage are written examples. Use real feedback from their Instagram highlights.
- **Checkout** doesn't send orders anywhere yet. It saves the order in the browser to show the confirmation page. The backend, admin and payments are the development phase.

## Admin console

The owner manages the shop from `/admin`, built for phones first: orders, products, stock, promos and categories. It can be added to the home screen like an app.

To try it without signing in or touching real data, open `/admin-preview` in development. It runs on sample data, and returns "not found" in production.
