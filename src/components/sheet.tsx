"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { CloseIcon } from "./icons";

type Side = "left" | "right" | "bottom";

const panelBySide: Record<Side, string> = {
  left: "inset-y-0 left-0 w-[88vw] max-w-sm data-[open=false]:-translate-x-full",
  right: "inset-y-0 right-0 w-full max-w-md data-[open=false]:translate-x-full",
  bottom:
    "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[1.75rem] data-[open=false]:translate-y-full md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:data-[open=false]:translate-x-full md:data-[open=false]:translate-y-0",
};

export function Sheet({
  open,
  onClose,
  side = "right",
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  side?: Side;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    panel.current?.focus({ preventScroll: true });
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none" inert={!open} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-ink/40 backdrop-blur-[2px] transition-opacity duration-500 ${open ? "opacity-100 pointer-events-auto" : "opacity-0"}`}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        data-open={open}
        className={`absolute flex flex-col bg-ivory shadow-2xl outline-none pointer-events-auto transition-[transform,visibility] duration-500 data-[open=false]:invisible ease-[var(--ease-out-soft)] ${panelBySide[side]}`}
      >
        {side === "bottom" && <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-ink/15 md:hidden" />}
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <div className="display text-2xl">{title}</div>
          <button onClick={onClose} className="-mr-2 grid size-11 place-items-center rounded-full hover:bg-mist" aria-label="Close">
            <CloseIcon />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="shrink-0 border-t border-line bg-ivory px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
