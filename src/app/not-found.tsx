import Link from "next/link";
import { WardrobeMark } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
      <WardrobeMark className="h-24 w-auto text-gold" />
      <h1 className="display mt-8 text-5xl">this drawer is empty</h1>
      <p className="mt-3 text-ink/65">The page you’re looking for has moved, or the piece has sold out and been taken down.</p>
      <Link href="/shop" className="btn btn-primary mt-8">Browse the wardrobe</Link>
    </div>
  );
}
