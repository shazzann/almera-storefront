import type { Metadata } from "next";
import Image from "@/components/image";
import Link from "next/link";
import { editorial, texture } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Our story",
  description: "almera is a Sri Lankan online boutique for Pakistani lawn, ready-to-wear and bridal wear, chosen piece by piece and delivered island-wide.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  { title: "Chosen piece by piece", body: "We don’t stock everything. Each suit is picked for fabric, finish and how it will wear in Sri Lankan heat." },
  { title: "Packed by hand", body: "Every order is checked, folded and wrapped by us before it reaches the courier." },
  { title: "Real people on the other end", body: "Questions about colour or fit? Message us on Instagram or WhatsApp and a person will reply." },
];

export default function AboutPage() {
  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pt-8 pb-16 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:pt-14 lg:pb-24">
        <div>
          <p className="eyebrow text-gold-deep">Our story</p>
          <h1 className="display mt-4 text-[3.2rem] sm:text-7xl">
            a wardrobe, <em className="text-sage-deep">not a warehouse</em>
          </h1>
          <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-ink/75">
            almera began as a small Instagram page with a simple idea: the Pakistani lawn and lehengas we loved should be easy to buy in Sri Lanka, without the guesswork.
          </p>
          <p className="mt-4 max-w-lg leading-relaxed text-ink/70">
            Today more than 7,000 women follow along for new drops, shoot days and parcels on their way. This site is the wardrobe behind the feed: every piece in one place, ready to order.
          </p>
        </div>
        <div className="relative mx-auto w-full max-w-md px-2.5 pt-2.5">
          <div aria-hidden className="arch absolute inset-0 border border-gold/60" />
          <div className="arch relative aspect-[4/5] overflow-hidden bg-sage">
            <Image src={editorial.courtyard} alt="Three women in shalwar kameez sitting together in a sunlit courtyard" fill loading="eager" sizes="(min-width: 1024px) 28rem, 92vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="bg-sage py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-8 md:grid-cols-[1fr_1.2fr] md:gap-16">
          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] shadow-xl shadow-ink/10">
            <Image src="/brand/almera-logo.jpg" alt="The almera logo: an arched wardrobe beside an olive tree" width={1078} height={1078} sizes="(min-width: 768px) 24rem, 90vw" />
          </div>
          <div>
            <p className="eyebrow text-ivory">The name and the mark</p>
            <h2 className="display mt-4 text-5xl text-ink sm:text-6xl">
              an olive tree <em className="text-olive">beside the wardrobe</em>
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-ink/80">
              Our mark is the arched almirah every desi home has, the one that holds the good clothes for Eid, weddings and visits. The olive tree is about growing slowly and carefully, the way we pick what goes inside.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-4 md:grid-cols-3 md:gap-6">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-[1.5rem] bg-ivory p-7">
              <h3 className="display text-3xl">{v.title}</h3>
              <p className="mt-3 leading-relaxed text-ink/70">{v.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:gap-6">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-sage-soft">
            <Image src={editorial.courtyardBench} alt="Women in traditional dress sitting on a stone bench" fill sizes="50vw" className="object-cover" />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-sage-soft">
            <Image src={texture.goldThread} alt="Close-up of gold thread embroidery" fill sizes="50vw" className="object-cover" />
          </div>
        </div>
        <div className="mt-14 text-center">
          <Link href="/shop" className="btn btn-primary">Open the wardrobe</Link>
        </div>
      </section>
    </>
  );
}
