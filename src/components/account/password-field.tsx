"use client";

import { useId, useState } from "react";
import { CheckIcon } from "@/components/icons";
import { STRENGTH_LABEL, checkPassword, type PasswordContext } from "@/lib/password-policy";
import { EyeIcon } from "./account-icons";
import { EyeOffIcon } from "@/components/admin/admin-icons";

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  error,
  hint,
  enterKeyHint = "done",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: "current-password" | "new-password";
  error?: string;
  hint?: React.ReactNode;
  enterKeyHint?: "next" | "done" | "go";
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[0.9rem] font-medium">{label}</label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint={enterKeyHint}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`field pr-14 ${error ? "border-[#a5432f]" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute top-1/2 right-1 grid size-11 -translate-y-1/2 place-items-center rounded-full text-ink/60"
        >
          {visible ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
        </button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.85rem] text-[#a5432f]">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-[0.82rem] leading-snug text-ink/60">{hint}</p>
      )}
    </div>
  );
}

/** Shows what's still needed as the customer types, so nobody has to guess the rules. */
export function PasswordChecklist({ password, context }: { password: string; context?: PasswordContext }) {
  const { rules, issues, strength } = checkPassword(password, context);

  return (
    <div className="rounded-xl bg-mist px-3.5 py-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className={`h-1.5 rounded-full transition-colors ${n > strength ? "bg-ink/10" : strength >= 3 ? "bg-sage-deep" : strength === 2 ? "bg-gold" : "bg-[#a5432f]"}`} />
          ))}
        </div>
        <span className="w-[5.5rem] text-right text-[0.8rem] font-medium">{STRENGTH_LABEL[strength] || "Password"}</span>
      </div>
      <ul className="mt-2.5 space-y-1 text-[0.85rem]">
        {rules.map((rule) => (
          <li key={rule.key} className={`flex items-center gap-2 ${rule.met ? "text-sage-deep" : "text-ink/60"}`}>
            {rule.met ? <CheckIcon className="size-4 shrink-0" /> : <span className="grid size-4 shrink-0 place-items-center"><span className="size-1.5 rounded-full bg-ink/30" /></span>}
            <span>{rule.label}<span className="sr-only">{rule.met ? " (done)" : " (still needed)"}</span></span>
          </li>
        ))}
      </ul>
      {password && issues.map((issue) => <p key={issue} className="mt-2 text-[0.85rem] leading-snug text-[#a5432f]">{issue}</p>)}
    </div>
  );
}
