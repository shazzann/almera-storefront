"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1745313452052-0e4e341f326c";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const safeImages = images.length > 0 ? images : [FALLBACK_IMAGE];
  const [index, setIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const go = (i: number) => {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev === null ? 0 : (prev + 1) % safeImages.length));
      }
      if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev === null ? 0 : (prev - 1 + safeImages.length) % safeImages.length,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, safeImages.length]);

  return (
    <div>
      {/* Phones: swipeable full-bleed carousel */}
      <div className="relative lg:hidden">
        <div
          ref={track}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          aria-label={`${name} photos`}
          role="region"
        >
          {safeImages.map((src, i) => (
            <button
              type="button"
              key={`${src}-${i}`}
              onClick={() => setLightboxIndex(i)}
              aria-label={`Zoom photo ${i + 1} of ${safeImages.length}`}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-sage-soft text-left"
            >
              <Image
                src={src}
                alt={i === 0 ? name : `${name}, detail ${i}`}
                fill
                sizes="100vw"
                priority={i === 0}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="object-cover"
              />
              <span className="absolute right-3 bottom-3 rounded-full bg-ink/60 px-2.5 py-1 text-[0.65rem] font-medium tracking-wider text-ivory uppercase backdrop-blur">
                Tap to zoom
              </span>
            </button>
          ))}
        </div>
        {safeImages.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 pointer-events-none">
            {safeImages.map((src, i) => (
              <button
                key={`${src}-dot-${i}`}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${safeImages.length}`}
                aria-current={i === index}
                className="pointer-events-auto grid h-6 place-items-center px-1"
              >
                <span
                  className={`block h-1 rounded-full bg-ivory transition-all duration-500 ${
                    i === index ? "w-7" : "w-2 opacity-60"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Larger screens: the first photo in a tall arch, then details below it */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {safeImages.map((src, i) => (
          <button
            type="button"
            key={`${src}-desktop-${i}`}
            onClick={() => setLightboxIndex(i)}
            aria-label={`Zoom photo ${i + 1} of ${safeImages.length}`}
            className={`group relative cursor-zoom-in overflow-hidden bg-sage-soft ${
              i === 0 ? "arch col-span-2 aspect-[4/5]" : "aspect-[3/4] rounded-2xl"
            }`}
          >
            <Image
              src={src}
              alt={i === 0 ? name : `${name}, detail ${i}`}
              fill
              sizes={i === 0 ? "55vw" : "27vw"}
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className="object-cover transition duration-700 group-hover:scale-[1.03]"
            />
            <span className="absolute right-4 bottom-4 rounded-full bg-ink/70 px-3 py-1.5 text-[0.68rem] font-medium tracking-wider text-ivory uppercase opacity-0 backdrop-blur transition group-hover:opacity-100">
              Click to zoom
            </span>
          </button>
        ))}
      </div>

      {/* Full-Screen Zoom Lightbox */}
      {lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photo zoom`}
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-ink/95 p-4 text-ivory backdrop-blur-md"
          onClick={() => setLightboxIndex(null)}
        >
          <div className="flex w-full max-w-5xl items-center justify-between pb-3">
            <p className="text-xs tracking-widest text-ivory/75 uppercase">
              {name} · {lightboxIndex + 1} / {safeImages.length}
            </p>
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="rounded-full border border-ivory/25 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase hover:bg-ivory hover:text-ink"
            >
              Close (Esc)
            </button>
          </div>
          <div
            className="relative h-[78vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-ink"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={safeImages[lightboxIndex]}
              alt={`${name} zoomed photo ${lightboxIndex + 1}`}
              fill
              sizes="95vw"
              priority
              className="object-contain"
            />
            {safeImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setLightboxIndex((lightboxIndex - 1 + safeImages.length) % safeImages.length)
                  }
                  aria-label="Previous photo"
                  className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full bg-ink/75 px-3.5 py-2 text-sm font-semibold text-ivory backdrop-blur hover:bg-ivory hover:text-ink"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex((lightboxIndex + 1) % safeImages.length)}
                  aria-label="Next photo"
                  className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full bg-ink/75 px-3.5 py-2 text-sm font-semibold text-ivory backdrop-blur hover:bg-ivory hover:text-ink"
                >
                  →
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
