import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const UserIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>
);
export const PinIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 21s7-6.100 7-11.500a7 7 0 1 0-14 0C5 14.900 12 21 12 21Z" /><circle cx="12" cy="9.500" r="2.500" /></svg>
);
export const LockIcon = (p: P) => (
  <svg {...base} {...p}><rect x="5" y="10.500" width="14" height="9.500" rx="2" /><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" /></svg>
);
export const ShieldIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 3.500 5 6v5.500c0 4.300 2.900 7.500 7 9 4.100-1.500 7-4.700 7-9V6z" /><path d="m9 12 2.200 2.200L15.200 10" /></svg>
);
export const EyeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M3 12s3.300-6.500 9-6.500S21 12 21 12s-3.300 6.500-9 6.500S3 12 3 12Z" /><circle cx="12" cy="12" r="2.800" /></svg>
);
export const PencilIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4.500 19.500 5.500 15 16 4.500l3.500 3.500L9 18.500z" /></svg>
);
