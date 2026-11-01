"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronIcon, MinusIcon, PlusIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { STATUS_LABEL, STATUS_TONE } from "./lib";

let releaseEntry: ReturnType<typeof setTimeout> | null = null;

/**
 * Bottom sheet that the phone's back button closes, rather than leaving the screen.
 * Content stays rendered while the sheet slides away.
 */
export function AdminSheet({
  open,
  onClose,
  title,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [lingering, setLingering] = useState(open);
  if (open && !lingering) setLingering(true);

  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setLingering(false), 500);
      return () => clearTimeout(t);
    }
    let poppedByBack = false;
    if (releaseEntry) {
      // Another sheet just closed: take over its history entry instead of adding one.
      clearTimeout(releaseEntry);
      releaseEntry = null;
    } else {
      window.history.pushState(null, "", window.location.href);
    }
    const onPop = () => {
      poppedByBack = true;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (!poppedByBack) {
        releaseEntry = setTimeout(() => {
          releaseEntry = null;
          window.history.back();
        }, 0);
      }
    };
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} side="bottom" title={title} footer={open || lingering ? footer : undefined}>
      {(open || lingering) && children}
    </Sheet>
  );
}

export function TopBar({
  title,
  onBack,
  right,
  subtitle,
}: {
  title: ReactNode;
  onBack?: () => void;
  right?: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-mist/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-3xl items-center gap-1 px-2 pt-[env(safe-area-inset-top)] sm:px-4">
        {onBack ? (
          <button onClick={onBack} aria-label="Back" className="grid size-12 shrink-0 place-items-center rounded-full hover:bg-ivory">
            <ChevronIcon className="size-6 rotate-180" />
          </button>
        ) : (
          <span className="w-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1 py-2">
          <h1 className={onBack ? "truncate text-lg leading-tight font-semibold" : "display text-[2.1rem] leading-none"}>{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-[0.82rem] text-ink/60">{subtitle}</p>}
        </div>
        {right && <div className="flex shrink-0 items-center">{right}</div>}
      </div>
    </header>
  );
}

export function IconButton({ label, onClick, children, disabled }: { label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} className="grid size-12 place-items-center rounded-full hover:bg-ivory disabled:opacity-40">
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[0.75rem] font-semibold whitespace-nowrap ${STATUS_TONE[status] ?? "bg-mist text-ink/65"}`}>
      {STATUS_LABEL[status] ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[1.25rem] border border-line bg-ivory ${className}`}>{children}</section>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-2.5 flex min-h-6 items-center justify-between gap-3 px-1">
      <h2 className="text-[0.95rem] font-semibold">{children}</h2>
      {right}
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: ReactNode; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[0.9rem] font-medium">{label}</span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[0.85rem] text-[#a5432f]">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-[0.82rem] leading-snug text-ink/60">{hint}</span>
      )}
    </label>
  );
}

/** Digits-only input that brings up the phone's number pad. */
export function NumberInput({
  value,
  onChange,
  prefix,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  return (
    <span className="relative block">
      {prefix && <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink/55">{prefix}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={ariaLabel}
        enterKeyHint="done"
        className={`field tabular-nums ${prefix ? "pl-12" : ""}`}
      />
    </span>
  );
}

export function Stepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-line bg-mist/70">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0} aria-label={`Decrease ${label}`} className="grid size-11 place-items-center disabled:opacity-30">
        <MinusIcon className="size-4" />
      </button>
      <input
        value={value}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        onFocus={(e) => e.target.select()}
        inputMode="numeric"
        aria-label={label}
        className="w-11 bg-transparent text-center font-semibold tabular-nums outline-none"
      />
      <button type="button" onClick={() => onChange(value + 1)} aria-label={`Increase ${label}`} className="grid size-11 place-items-center">
        <PlusIcon className="size-4" />
      </button>
    </span>
  );
}

export function StockRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3">
      <span className="font-medium">{label}</span>
      <Stepper label={`${label} stock`} value={value} onChange={onChange} />
    </div>
  );
}

export function SwitchRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex min-h-14 cursor-pointer items-center justify-between gap-4 py-2 ${disabled ? "opacity-50" : ""}`}>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-[0.82rem] leading-snug text-ink/60">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="relative h-7 w-12 shrink-0 rounded-full bg-ink/20 transition peer-checked:bg-sage-deep peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold after:absolute after:top-0.5 after:left-0.5 after:size-6 after:rounded-full after:bg-ivory after:shadow after:transition peer-checked:after:translate-x-5" />
    </label>
  );
}

export function Chip({ on, onClick, children, count }: { on: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-[0.9rem] font-medium transition ${on ? "border-ink bg-ink text-ivory" : "border-line bg-ivory text-ink/80"}`}
    >
      {children}
      {count != null && count > 0 && <span className={`text-[0.8rem] tabular-nums ${on ? "text-ivory/70" : "text-ink/50"}`}>{count}</span>}
    </button>
  );
}

export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} enterKeyHint="search" aria-label={placeholder} className="field" />
  );
}

/** Thumb-reach action bar pinned above the phone's home indicator. */
export function StickyBar({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-24" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ivory/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:left-56">
        <div className="mx-auto flex max-w-3xl gap-2.5">{children}</div>
      </div>
    </>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-ink/20 px-6 py-12 text-center">
      <p className="display text-3xl">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-[0.95rem] leading-relaxed text-ink/60">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[1.25rem] bg-sage-soft/60 ${className}`} />;
}
