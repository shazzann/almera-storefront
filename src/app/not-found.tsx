import type { Metadata } from "next";
import Link from "next/link";
import { WardrobeMark } from "@/components/brand";
import { categories } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Page Not Found",
  description:
    "The page or piece you are looking for has moved or sold out. Explore the almera wardrobe for new Pakistani lawn suits, shalwar kameez, and bridal lehengas.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <WardrobeMark className="h-24 w-auto text-gold" />
      <h1 className="display mt-8 text-5xl">this drawer is empty</h1>
      <p className="mt-3 text-ink/65">
        The page you’re looking for has moved, or the piece has sold out and been taken down.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className="btn btn-primary">
          Browse the wardrobe
        </Link>
        <Link href="/" className="btn btn-ghost">
          Return home
        </Link>
      </div>
      <div className="mt-10">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink/55 uppercase">
          Explore by Drawer
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {categories.slice(0, 6).map((c) => (
            <Link
              key={c.slug}
              href={`/shop/${c.slug}`}
              className="rounded-full border border-line bg-ivory px-4 py-1.5 text-xs font-medium transition hover:border-ink"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
