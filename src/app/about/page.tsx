import type { Metadata } from "next";
import Image from "@/components/image";
import Link from "next/link";
import { WardrobeMark } from "@/components/brand";
import { ArrowIcon } from "@/components/icons";
import { categories, editorial, texture } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Our story",
  description:
    "About Almera — A Dream Woven into Every Dress. Carefully selected Indian and Pakistani dress collections, delivered island-wide across Sri Lanka.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  "Passion",
  "Quality",
  "Affordability",
  "A personal connection with every customer",
];

const pakistaniEditorial =
  categories.find((c) => c.slug === "pakistani")?.image ?? editorial.hero;

function ArchFrame({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  return (
    <div className="relative mx-auto w-full max-w-md px-2.5 pt-2.5">
      <div aria-hidden className="arch absolute inset-0 border border-gold/60" />
      <div className="arch relative aspect-[4/5] overflow-hidden bg-sage">
        <Image
          src={src}
          alt={alt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(min-width: 1024px) 28rem, 92vw"
          className="object-cover"
        />
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <div className="bg-ivory text-ink">
      {/* 1. Hero — About Almera: A Dream Woven into Every Dress */}
      <section className="mx-auto max-w-7xl px-4 pt-10 pb-16 sm:px-8 sm:pt-14 sm:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div>
            <p className="eyebrow text-sage-deep">About Almera</p>
            <h1 className="display mt-4 text-[3.2rem] text-ink sm:text-6xl lg:text-[4.5rem]">
              a dream woven <em className="text-olive">into every dress</em>
            </h1>
            <div className="mt-6 max-w-xl space-y-4 text-[1.02rem] leading-relaxed text-ink/80">
              <p>
                Every beautiful journey begins with a dream. For Almera, that dream began in 2024, with a girl’s passion for fashion, a love for beautiful designs, and the desire to bring something special to women who appreciate elegance and style.
              </p>
              <p>
                What started as a personal dream of becoming a fashion designer gradually blossomed into a home-based boutique. With every step, Almera grew from a simple idea into something much more meaningful — a brand built on passion, creativity, and the belief that every woman deserves to feel beautiful and confident in what she wears.
              </p>
            </div>
          </div>

          <ArchFrame
            src={pakistaniEditorial}
            alt="Embroidered Pakistani suit from the Almera collection"
            eager
          />
        </div>
      </section>

      {/* 2. The Name and the Mark — Split Sage & Cream Banner */}
      <section className="grid border-y border-line md:grid-cols-[0.42fr_0.58fr] lg:grid-cols-[0.36fr_0.64fr]">
        <div className="flex items-center justify-center bg-sage px-6 py-12 sm:px-10 sm:py-16 lg:py-20">
          <div className="w-full max-w-[21rem] overflow-hidden rounded-[2rem] bg-sage shadow-xl shadow-ink/12">
            <Image
              src="/brand/almera-logo-new.jpeg"
              alt="The almera logo: an arched wardrobe beside an olive tree"
              width={1254}
              height={1254}
              sizes="(min-width: 768px) 21rem, 85vw"
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="flex flex-col justify-center bg-ivory px-5 py-12 sm:px-12 sm:py-16 lg:px-20 lg:py-20">
          <p className="eyebrow text-sage-deep">The name and the mark</p>
          <h2 className="display mt-4 text-5xl text-ink sm:text-6xl">
            an olive tree <em className="text-olive">beside the wardrobe</em>
          </h2>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-ink/80">
            Our mark is the arched almirah every desi home has, the one that holds the good clothes for Eid, weddings and visits. The olive tree is about growing slowly and carefully, the way we pick what goes inside.
          </p>
        </div>
      </section>

      {/* 3. The Journey Continues — Islandwide & Community Support */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <div className="space-y-5 text-[1.02rem] leading-relaxed text-ink/80">
            <p>
              But Almera’s journey has never been a journey of one person alone. Behind every milestone are the helping hands, encouraging words, and endless support of a loving husband, family members, and friends who believed in the dream and encouraged it to become a reality. Their support is a special part of Almera’s story, and their belief continues to inspire us.
            </p>
            <p>
              Today, Almera brings together carefully selected Indian and Pakistani dress collections, celebrating the beauty of traditional craftsmanship, graceful designs, and timeless fashion. From elegant everyday outfits to beautiful statement pieces for special occasions, we aim to offer collections that make every woman feel confident, comfortable, and uniquely herself.
            </p>
            <p>
              Although we began as a home-based boutique, our vision has always reached beyond one place. Today, Almera welcomes customers from across Sri Lanka, making beautiful fashion accessible to women islandwide. Wherever our customers are, we want them to experience the same care, attention, and personal touch that have been part of Almera from the beginning.
            </p>
          </div>

          <ArchFrame
            src={editorial.courtyard}
            alt="Elegant ready-to-wear outfit selected for everyday comfort and grace"
          />
        </div>
      </section>

      {/* 4. Our Philosophy — More Than a Boutique (Separate Arch Section) */}
      <section className="border-t border-line bg-mist/45">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            <div className="order-2 lg:order-1">
              <ArchFrame
                src={editorial.courtyardBench}
                alt="Intricately embellished festive attire celebrating individuality"
              />
            </div>

            <div className="order-1 lg:order-2">
              <p className="eyebrow text-sage-deep">Our philosophy</p>
              <h2 className="display mt-4 text-5xl text-ink sm:text-6xl">
                more than <em className="text-olive">a boutique</em>
              </h2>
              <div className="mt-6 max-w-xl space-y-4 text-[1.02rem] leading-relaxed text-ink/80">
                <p>
                  Almera is not simply about selling dresses. It is about celebrating women, expressing individuality, and creating little moments of happiness through fashion.
                </p>
                <p>
                  Every collection represents our love for beautiful clothing and our commitment to finding styles that our customers will truly love. We believe fashion is not just about what you wear; it is about how you feel when you wear it.
                </p>
                <p className="font-medium text-ink">
                  To us, every customer is part of our journey, and every order is another reason to keep dreaming bigger.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. The Future — Where We Are Heading (Separate Arch Section) */}
      <section className="border-t border-line bg-ivory">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div>
              <p className="eyebrow text-sage-deep">The future</p>
              <h2 className="display mt-4 text-5xl text-ink sm:text-6xl">
                where we <em className="text-olive">are heading</em>
              </h2>
              <div className="mt-6 max-w-xl space-y-4 text-[1.02rem] leading-relaxed text-ink/80">
                <p>
                  Our journey has only just begun. From a girl’s fashion dream to a growing home-based boutique, Almera is taking its next steps with bigger ambitions and endless possibilities.
                </p>
                <p>
                  Looking ahead, we dream of expanding our collections, introducing more exclusive and carefully selected Indian and Pakistani designs, reaching more customers across Sri Lanka, and eventually growing Almera into a recognised fashion destination.
                </p>
                <p>
                  We hope to build a brand that women can trust, return to, and proudly recommend. As we grow, we want to stay true to the values that started it all — passion, quality, affordability, and a personal connection with every customer.
                </p>
                <p className="font-medium text-ink">
                  Because for us, success is not just about how far Almera grows, but about how many women we make feel beautiful along the way.
                </p>
              </div>

              <div className="mt-8 flex flex-wrap gap-2.5">
                {VALUES.map((val) => (
                  <span
                    key={val}
                    className="rounded-full border border-line bg-mist/60 px-4 py-2 text-xs font-semibold tracking-[0.14em] text-sage-deep uppercase"
                  >
                    {val}
                  </span>
                ))}
              </div>
            </div>

            <ArchFrame
              src={texture.chikan}
              alt="Fine floral chikankari embroidery detail"
            />
          </div>
        </div>
      </section>

      {/* 6. Closing Sign-off */}
      <section className="bg-sage py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-8">
          <div className="rounded-[2rem] bg-ivory px-6 py-12 shadow-xl shadow-ink/10 sm:px-12 sm:py-16">
            <WardrobeMark className="mx-auto h-16 w-auto text-gold" />
            <p className="display mt-6 text-3xl leading-snug text-ink sm:text-5xl">
              a dream that started small.{" "}
              <em className="text-olive">a style that speaks beautifully.</em>{" "}
              a journey that has only just begun.
            </p>
            <p className="eyebrow mt-8 text-sage-deep">
              ALMERA — Wear Your Dream. Own Your Elegance.
            </p>
            <div className="mt-9">
              <Link href="/shop" className="btn btn-primary">
                Open the wardrobe <ArrowIcon className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
