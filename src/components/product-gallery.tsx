"use client";

import Image from "next/image";
import { useRef, useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = track.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  const go = (i: number) => {
    const el = track.current;
    el?.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  };

  return (
    <div>
      {/* Phones: swipeable full-bleed carousel */}
      <div className="relative lg:hidden">
        <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" aria-label={`${name} photos`} role="region">
          {images.map((src, i) => (
            <div key={src} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-sage-soft">
              <Image src={src} alt={i === 0 ? name : `${name}, detail ${i}`} fill sizes="100vw" loading={i === 0 ? "eager" : "lazy"} className="object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
            {images.map((src, i) => (
              <button
                key={src}
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-current={i === index}
                className="grid h-6 place-items-center px-1"
              >
                <span className={`block h-1 rounded-full bg-ivory transition-all duration-500 ${i === index ? "w-7" : "w-2 opacity-60"}`} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Larger screens: the first photo in a tall arch, then details below it */}
      <div className="hidden gap-4 lg:grid lg:grid-cols-2">
        {images.map((src, i) => (
          <div key={src} className={`relative overflow-hidden bg-sage-soft ${i === 0 ? "arch col-span-2 aspect-[4/5]" : "aspect-[3/4] rounded-2xl"}`}>
            <Image src={src} alt={i === 0 ? name : `${name}, detail ${i}`} fill sizes={i === 0 ? "55vw" : "27vw"} className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
