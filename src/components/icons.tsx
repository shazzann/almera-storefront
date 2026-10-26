import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const MenuIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3.5 8h17M3.5 16h11" /></svg>
);
export const SearchIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>
);
export const BagIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 8.5h14l-1 11.5H6L5 8.5Z" /><path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" /></svg>
);
export const CloseIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const ArrowIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 12h16M14 6l6 6-6 6" /></svg>
);
export const ChevronIcon = (p: P) => (
  <svg {...base} {...p}><path d="m9 6 6 6-6 6" /></svg>
);
export const PlusIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);
export const MinusIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 12h14" /></svg>
);
export const FilterIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
);
export const CheckIcon = (p: P) => (
  <svg {...base} {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const TruckIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 6.5h11v9H3zM14 9.5h3.5L21 13v2.5h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>
);
export const NeedleIcon = (p: P) => (
  <svg {...base} {...p}><path d="M19 5 7.5 16.5" /><path d="M17 4.5a1.5 1.5 0 1 1 2.5 2" /><path d="M7.5 16.5 5 19" /><path d="M10 10c-4 1-6 4-4 6s5 0 6-4" /></svg>
);
export const InstagramIcon = (p: P) => (
  <svg {...base} {...p}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></svg>
);
export const WhatsAppIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 20l1.2-3.8A8 8 0 1 1 8 19z" /><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8a5 5 0 0 1-2.8-2.8l.8-1-1-2Z" /></svg>
);
