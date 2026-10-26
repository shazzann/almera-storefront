import Image from "next/image";
import Link from "next/link";
import { WardrobeMark } from "@/components/brand";
import { ArrowIcon, InstagramIcon, NeedleIcon } from "@/components/icons";
import { ProductCard } from "@/components/product-card";
import { WardrobeHero } from "@/components/wardrobe-hero";
import { STITCHING_FEE, categories, editorial, formatLKR, products, productsIn, texture } from "@/lib/catalog";

const newIn = products.filter((p) => p.tags.includes("new")).slice(0, 8);
const loved = products.filter((p) => p.tags.includes("bestseller"));
const lehengas = productsIn("lehengas").slice(0, 3);

const NOTES = [
  { quote: "The lawn was even softer than in the reel, and it reached Kandy in two days. Already ordered my Eid suit.", name: "Shifana", city: "Kandy" },
  { quote: "They stitched my suit to my measurements and the fit was perfect first time. Packaging felt like a gift.", name: "Rizna", city: "Colombo 06" },
  { quote: "My walima lehenga was exactly the colour I was shown. They answered every question on WhatsApp the same day.", name: "Aathika", city: "Batticaloa" },
];


export default function Home() {
  return (
    <>
      <WardrobeHero image={editorial.hero} />

      {/* Categories */}
      <section className="pb-16 sm:pb-24" aria-labelledby="drawers">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <SectionHead eyebrow="The wardrobe" title={<>shop by <em>drawer</em></>} id="drawers" />
        </div>
        <div className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 sm:mx-auto sm:max-w-7xl sm:grid sm:grid-cols-3 sm:gap-6 sm:overflow-visible sm:px-8">
          {categories.map((c) => (
            <Link key={c.slug} href={`/shop/${c.slug}`} className="group w-[68vw] shrink-0 snap-start sm:w-auto">
              <div className="arch relative aspect-[3/4] overflow-hidden bg-sage-soft">
                <Image src={c.image} alt="" fill sizes="(min-width: 640px) 31vw, 68vw" className="object-cover transition duration-[1.4s] ease-[var(--ease-out-soft)] group-hover:scale-105" />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <h3 className="display text-[2rem] sm:text-[2.4rem]">{c.name}</h3>
                <span className="text-sm text-ink/55">{productsIn(c.slug).length} pieces</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="bg-ivory py-16 sm:py-24" aria-labelledby="just-in">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <SectionHead eyebrow="New arrivals" title={<>just <em>in</em></>} id="just-in" href="/shop" cta="View all" />
          <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {newIn.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Stitched or unstitched */}
      <section className="py-16 sm:py-24" aria-labelledby="stitching">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <SectionHead eyebrow="Two ways to wear it" title={<>stitched <em>or</em> unstitched?</>} id="stitching" />
          <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
            <StitchCard
              image={texture.fabricStack}
              label="Unstitched"
              title="the fabric, for your own tailor"
              points={["Embroidered shirt front, printed back & sleeves", "2.5 m dupatta and 2.5 m trouser fabric", "Ships in 1–2 days"]}
              href="/shop/lawn"
              cta="Shop unstitched lawn"
            />
            <StitchCard
              image={texture.chikan}
              label="Stitched"
              title="made to your size by our tailors"
              points={["Standard sizes XS–XL, see the size guide", `Lawn stitching adds ${formatLKR(STITCHING_FEE)}`, "Stitched and pressed in 5–7 days"]}
              href="/shop/shalwar-kameez"
              cta="Shop ready to wear"
              accent
            />
          </div>
        </div>
      </section>

      {/* Lehenga editorial */}
      <section className="bg-ink text-ivory" aria-labelledby="bridal">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[44rem]">
            <Image src={editorial.bridal} alt="Bride in a rose lehenga standing in an arched doorway" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="flex flex-col justify-center px-5 py-14 sm:px-12 lg:px-16">
            <p className="eyebrow text-sage">The lehenga edit</p>
            <h2 id="bridal" className="display mt-4 text-5xl sm:text-6xl">
              for the nikah, the mehndi <em className="text-sage">&amp; the walima</em>
            </h2>
            <div className="mt-10 grid grid-cols-3 gap-3">
              {lehengas.map((p) => (
                <Link key={p.slug} href={`/product/${p.slug}`} className="group">
                  <div className="arch-soft relative aspect-[3/4] overflow-hidden bg-olive">
                    <Image src={p.images[0]} alt={p.name} fill sizes="(min-width: 1024px) 12vw, 30vw" className="object-cover transition duration-1000 group-hover:scale-105" />
                  </div>
                  <p className="mt-2 text-[0.8rem] leading-snug text-ivory/80 group-hover:text-sage">{p.name}</p>
                </Link>
              ))}
            </div>
            <Link href="/shop/lehengas" className="btn mt-10 self-start border border-ivory/50 hover:bg-ivory hover:text-ink">
              Explore lehengas <ArrowIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Most loved */}
      <section className="py-16 sm:py-24" aria-labelledby="loved">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <SectionHead eyebrow="Ordered again and again" title={<>most <em>loved</em></>} id="loved" href="/shop" cta="Shop all" />
        </div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 sm:gap-6 sm:px-8 lg:mx-auto lg:max-w-7xl">
          {loved.map((p) => (
            <div key={p.slug} className="w-[46vw] shrink-0 snap-start sm:w-[30vw] lg:w-[calc((100%-4.5rem)/4)]">
              <ProductCard product={p} sizes="(min-width: 1024px) 22vw, 46vw" />
            </div>
          ))}
        </div>
      </section>


      {/* Client notes */}
      <section className="py-16 sm:py-24" aria-labelledby="notes">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <SectionHead eyebrow="Clients ♥" title={<>in their <em>words</em></>} id="notes" />
        </div>
        <div className="no-scrollbar mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 md:mx-auto md:grid md:max-w-7xl md:grid-cols-3 md:gap-6 md:px-8">
          {NOTES.map((n) => (
            <figure key={n.name} className="flex w-[82vw] shrink-0 snap-start flex-col rounded-[1.5rem] border border-line bg-ivory p-7 md:w-auto">
              <WardrobeMark className="h-8 w-auto self-start text-gold" />
              <blockquote className="display mt-5 flex-1 text-[1.6rem] leading-[1.15] normal-case italic">“{n.quote}”</blockquote>
              <figcaption className="mt-6 text-sm text-ink/60">
                <span className="font-semibold text-ink">{n.name}</span> · {n.city}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Instagram */}
      <section className="pb-20" aria-labelledby="insta">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-5 rounded-[2rem] bg-ivory p-6 sm:p-10 md:flex-row md:items-center">
            <div>
              <p className="eyebrow text-gold-deep">7,000+ following along</p>
              <h2 id="insta" className="display mt-3 text-4xl sm:text-5xl">
                new drops land on <em>instagram</em> first
              </h2>
            </div>
            <a href="https://www.instagram.com/almera.lk/" target="_blank" rel="noreferrer" className="btn btn-primary shrink-0">
              <InstagramIcon className="size-4" /> Follow @almera.lk
            </a>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {[texture.goldThread, products[1].images[0], texture.dupatta, products[17].images[0], texture.bloom, products[9].images[0]].map((src, i) => (
              <a key={i} href="https://www.instagram.com/almera.lk/" target="_blank" rel="noreferrer" className="group relative aspect-square overflow-hidden rounded-xl bg-sage-soft" aria-label="Open almera on Instagram">
                <Image src={src} alt="" fill sizes="(min-width: 640px) 16vw, 33vw" className="object-cover transition duration-700 group-hover:scale-105" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function SectionHead({ eyebrow, title, id, href, cta }: { eyebrow: string; title: React.ReactNode; id: string; href?: string; cta?: string }) {
  return (
    <div className="flex items-end justify-between gap-6">
      <div>
        <p className="eyebrow text-gold-deep">{eyebrow}</p>
        <h2 id={id} className="display mt-3 text-[2.6rem] sm:text-6xl [&_em]:text-sage-deep">
          {title}
        </h2>
      </div>
      {href && (
        <Link href={href} className="link-underline mb-2 shrink-0 text-[0.72rem] font-semibold tracking-[0.16em] uppercase">
          {cta}
        </Link>
      )}
    </div>
  );
}

function StitchCard({ image, label, title, points, href, cta, accent }: { image: string; label: string; title: string; points: string[]; href: string; cta: string; accent?: boolean }) {
  return (
    <div className={`flex overflow-hidden rounded-[1.75rem] ${accent ? "bg-olive text-ivory" : "bg-ivory"}`}>
      <div className="arch relative m-3 mr-0 w-[38%] shrink-0 overflow-hidden bg-sage-soft sm:m-4 sm:mr-0">
        <Image src={image} alt="" fill sizes="(min-width: 768px) 18vw, 36vw" className="object-cover" />
      </div>
      <div className="flex flex-col p-5 sm:p-8">
        <p className={`eyebrow flex items-center gap-2 ${accent ? "text-sage" : "text-gold-deep"}`}>
          <NeedleIcon className="size-4" /> {label}
        </p>
        <h3 className="display mt-3 text-[1.85rem] sm:text-4xl">{title}</h3>
        <ul className={`mt-4 space-y-2 text-[0.9rem] leading-snug ${accent ? "text-ivory/75" : "text-ink/70"}`}>
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className={`mt-[0.45rem] size-1 shrink-0 rounded-full ${accent ? "bg-sage" : "bg-gold"}`} />
              {p}
            </li>
          ))}
        </ul>
        <Link href={href} className="link-underline mt-6 self-start pt-2 text-[0.72rem] font-semibold tracking-[0.16em] uppercase">
          {cta}
        </Link>
      </div>
    </div>
  );
}
