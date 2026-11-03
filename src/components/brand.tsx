import type { SVGProps } from "react";

/** Line drawing of the arched wardrobe from almera's logo. */
export function WardrobeMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 52" fill="none" stroke="currentColor" strokeWidth={1.1} aria-hidden {...props}>
      <path d="M4 50V20a16 16 0 0 1 32 0v30" />
      <path d="M7.5 50V20.5a12.5 12.5 0 0 1 25 0V50" />
      <path d="M7.5 19h25" />
      <path d="M20 8v11M13 10.5l3.6 8.5M27 10.5l-3.6 8.5M9.2 14.5l6 4.5M30.8 14.5l-6 4.5" strokeWidth={0.8} />
      <path d="M20 19v19M7.5 38h25M7.5 44h25M20 38v12" />
      <path d="M17.6 27v3M22.4 27v3" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M2.5 50h35" />
    </svg>
  );
}

export function Wordmark({ className = "", tagline = true }: { className?: string; tagline?: boolean }) {
  return (
    <span className={`inline-flex flex-col items-center leading-none whitespace-nowrap ${className}`}>
      <span className="display text-[1.9rem] tracking-[0.01em] text-olive sm:text-[2.2rem]">almera</span>
      {tagline && (
        <span className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.42em] text-gold-deep">
          the desi wardrobe
        </span>
      )}
    </span>
  );
}
