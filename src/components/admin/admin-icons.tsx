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

export const HomeIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 11.5 12 5l8 6.5" /><path d="M6.5 10v9.5h11V10" /><path d="M10 19.5V14h4v5.5" /></svg>
);
export const OrdersIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z" /><path d="M9.5 8.5h5M9.5 12.5h5" /></svg>
);
export const BoxIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 8 12 4l8 4v8.5L12 20l-8-3.5z" /><path d="M4 8l8 3.5L20 8M12 11.5V20" /></svg>
);
export const PercentIcon = (p: P) => (
  <svg {...base} {...p}><path d="M18 6 6 18" /><circle cx="7.5" cy="7.5" r="2.5" /><circle cx="16.5" cy="16.5" r="2.5" /></svg>
);
export const MoreIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="5.5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18.5" cy="12" r="1.3" /></svg>
);
export const PhoneIcon = (p: P) => (
  <svg {...base} {...p}><path d="M6 4h3l1.5 4.5L8.5 10a11 11 0 0 0 5.5 5.5l1.5-2L20 15v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 6.200 2 2 0 0 1 6 4Z" /></svg>
);
export const CopyIcon = (p: P) => (
  <svg {...base} {...p}><rect x="8.500" y="8.500" width="11" height="11" rx="2" /><path d="M15.500 8.500V6a1.500 1.500 0 0 0-1.500-1.500H6A1.500 1.500 0 0 0 4.500 6v8A1.500 1.500 0 0 0 6 15.500h2.500" /></svg>
);
export const PrintIcon = (p: P) => (
  <svg {...base} {...p}><path d="M7 8V4h10v4" /><rect x="4" y="8" width="16" height="8" rx="2" /><path d="M7 14h10v6H7z" /></svg>
);
export const CameraIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 8h3.500L9 5.500h6L16.500 8H20v11H4z" /><circle cx="12" cy="13" r="3.500" /></svg>
);
export const RefreshIcon = (p: P) => (
  <svg {...base} {...p}><path d="M19.500 12a7.500 7.500 0 1 1-2.200-5.300L19.500 9" /><path d="M19.500 4.500V9H15" /></svg>
);
export const EyeOffIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4 4l16 16" /><path d="M9.800 5.500A9 9 0 0 1 21 12a13 13 0 0 1-2.500 3.300M6.500 7.300A13 13 0 0 0 3 12a9 9 0 0 0 11.500 6" /></svg>
);
export const LayersIcon = (p: P) => (
  <svg {...base} {...p}><path d="m12 4 8 4.500-8 4.500-8-4.500z" /><path d="m4 13 8 4.500 8-4.500" /></svg>
);
export const ClockIcon = (p: P) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7.500V12l3 2" /></svg>
);
export const DownloadIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 4v11M7.500 11 12 15.500 16.500 11" /><path d="M5 20h14" /></svg>
);
export const StoreIcon = (p: P) => (
  <svg {...base} {...p}><path d="M5 10v10h14V10" /><path d="M3.500 10 5.500 4h13l2 6a3 3 0 0 1-5.700 1 3 3 0 0 1-5.600 0 3 3 0 0 1-5.700-1Z" /></svg>
);
export const SignOutIcon = (p: P) => (
  <svg {...base} {...p}><path d="M10 5H5v14h5" /><path d="M9.500 12H20M16 8l4 4-4 4" /></svg>
);
export const LockIcon = (p: P) => (
  <svg {...base} {...p}><rect x="5.500" y="10.500" width="13" height="9.500" rx="2" /><path d="M8.500 10.500V7.500a3.500 3.500 0 0 1 7 0v3" /></svg>
);
export const TrashIcon = (p: P) => (
  <svg {...base} {...p}><path d="M4.500 7h15M9.500 7V4.500h5V7M6.500 7l1 13h9l1-13" /></svg>
);
export const AddToHomeIcon = (p: P) => (
  <svg {...base} {...p}><rect x="6.500" y="3" width="11" height="18" rx="2.500" /><path d="M12 9v6M9 12h6" /></svg>
);
export const AlertIcon = (p: P) => (
  <svg {...base} {...p}><path d="M12 4 3 20h18z" /><path d="M12 10v4.500M12 17.500v.1" /></svg>
);
