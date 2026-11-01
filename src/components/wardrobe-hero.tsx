import Image from "next/image";
import Link from "next/link";
import { formatLKR, startingPrice, type Product } from "@/lib/catalog";
import { ArrowIcon } from "./icons";

/** One wardrobe door. The fanlight rays and panels echo the wardrobe in almera's logo. */
function Door({ side }: { side: "left" | "right" }) {
  const left = side === "left";
  return (
    <div
      aria-hidden
      className={`absolute inset-y-0 w-1/2 bg-ivory [backface-visibility:hidden] ${left ? "left-0 origin-left animate-door-left border-r border-gold/50" : "right-0 origin-right animate-door-right border-l border-gold/50"}`}
    >
      <svg className="absolute inset-x-0 top-0 h-[38%] w-full text-gold/70" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="currentColor">
        {[0, 1, 2, 3].map((i) => {
          const x = left ? 100 - i * 28 : i * 28;
          return <path key={i} d={`M${left ? 100 : 0} 100 L${x} ${i === 0 ? 8 : 20 + i * 6}`} vectorEffect="non-scaling-stroke" strokeWidth={1} />;
        })}
        <path d={left ? "M0 100 H100" : "M0 100 H100"} vectorEffect="non-scaling-stroke" strokeWidth={1} />
      </svg>
      <div className={`absolute top-[41%] bottom-[22%] ${left ? "right-[10%] left-[14%]" : "right-[14%] left-[10%]"} rounded-[3px] border border-gold/55`}>
        <span className={`absolute top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-gold ${left ? "right-2" : "left-2"}`} />
      </div>
      <div className={`absolute bottom-[5%] h-[12%] ${left ? "right-[10%] left-[14%]" : "right-[14%] left-[10%]"} rounded-[3px] border border-gold/55`}>
        <span className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-full bg-gold" />
      </div>
    </div>
  );
}

export function WardrobeHero({ image, cover, season }: { image: string; cover?: Product; season: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-6 pb-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pt-10 lg:pb-24">
        <div className="order-2 lg:order-1">
          {season && <p className="eyebrow animate-rise text-gold-deep" style={{ animationDelay: "0.80s" }}>{season}</p>}
          <h1 className="display mt-4 animate-rise text-[3.4rem] text-ink sm:text-7xl lg:text-[6.2rem] xl:text-[6.8rem]" style={{ animationDelay: "0.95s" }}>
            the wardrobe <br /><em className="text-sage-deep">is open</em>
          </h1>
          <p className="mt-5 max-w-md animate-rise text-[1.02rem] leading-relaxed text-ink/75" style={{ animationDelay: "1.10s" }}>
            From everyday lawn to bridal lehengas, delivered anywhere in Sri Lanka.
          </p>
          <div className="mt-8 flex animate-rise flex-col gap-3 sm:flex-row" style={{ animationDelay: "1.25s" }}>
            <Link href="/shop" className="btn btn-primary">
              Shop new arrivals <ArrowIcon className="size-4" />
            </Link>
          </div>
        </div>

        <div className="order-1 mx-auto w-full max-w-[30rem] lg:order-2">
          <div className="relative px-2.5 pt-2.5">
            {/* Gold frame around the arch, like the wardrobe's moulding. */}
            <div aria-hidden className="arch absolute inset-0 border border-gold/60" />
            <div className="arch relative aspect-[4/5] overflow-hidden bg-sage [perspective:1600px]">
              <Image
                src={image}
                alt={cover?.name ?? "Model in a jade tiered lehenga seated beneath an arched window"}
                fill
                preload
                sizes="(min-width: 1024px) 30rem, 92vw"
                className="animate-settle object-cover object-[50%_30%]"
              />
              <Door side="left" />
              <Door side="right" />
            </div>
          </div>
          {cover && (
            <Link
              href={`/product/${cover.slug}`}
              className="group mt-3 flex items-center justify-between gap-4 border-b border-line pb-3 text-sm"
            >
              <span>
                {cover.name}
              </span>
              <span className="flex items-center gap-2 font-semibold">
                {formatLKR(startingPrice(cover))}
                <ArrowIcon className="size-4 transition group-hover:translate-x-1" />
              </span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
