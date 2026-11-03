"use client";

import { useState } from "react";
import { PlusIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { CopyIcon, TrashIcon } from "./admin-icons";
import { discountLabel, num, type Coupon } from "./lib";
import { AdminSheet, Card, EmptyState, Field, IconButton, NumberInput, StickyBar, SwitchRow, TopBar } from "./ui";

export function PromosScreen() {
  const { data, go } = useAdmin();
  return (
    <>
      <TopBar title="promos" subtitle="Discount codes for your customers" />
      <div className="mx-auto max-w-3xl space-y-2.5 px-4 pt-4 pb-6">
        {data.coupons.length === 0 ? (
          <EmptyState
            title="no promo codes"
            body="Create a code to share on Instagram or give to an influencer."
            action={<button onClick={() => go({ view: "promo", id: "new" })} className="btn btn-primary">Create promo code</button>}
          />
        ) : (
          data.coupons.map((c) => <PromoCard key={c.code} coupon={c} />)
        )}
      </div>
      {data.coupons.length > 0 && (
        <button
          onClick={() => go({ view: "promo", id: "new" })}
          className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-ink pr-5 pl-4 font-semibold text-ivory shadow-lg lg:bottom-6"
        >
          <PlusIcon className="size-5" /> New code
        </button>
      )}
    </>
  );
}

function isExpired(c: Coupon) {
  return Boolean(c.expires_at) && new Date(c.expires_at!).getTime() < Date.now();
}

function PromoCard({ coupon: c }: { coupon: Coupon }) {
  const { go, source, run, toast } = useAdmin();
  const [busy, setBusy] = useState(false);
  const expired = isExpired(c);
  const used = num(c.used_count);

  async function toggle(active: boolean) {
    setBusy(true);
    await run(() => source.saveCoupon({ ...c, is_active: active }), `${c.code} ${active ? "is on" : "is paused"}`);
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(c.code);
      toast(`${c.code} copied`);
    } catch {
      toast("Couldn't copy on this phone.", "err");
    }
  }

  return (
    <Card>
      <div className="flex items-start gap-2 p-4 pb-1">
        <button onClick={() => go({ view: "promo", id: c.id ?? c.code })} className="min-w-0 flex-1 text-left" aria-label={`Edit ${c.code}`}>
          <p className="truncate font-mono text-[1.15rem] font-bold tracking-wide">{c.code}</p>
          <p className="mt-0.5 font-medium">{discountLabel(c)}</p>
          <p className="mt-1 text-[0.85rem] leading-snug text-ink/60">
            {num(c.min_order_value) > 0 ? `Over ${formatLKR(num(c.min_order_value))} · ` : ""}
            Used {used}{c.max_uses ? ` of ${num(c.max_uses)}` : ""} {used === 1 && !c.max_uses ? "time" : c.max_uses ? "" : "times"}
            {c.is_public === false ? " · Private" : ""}
          </p>
          {c.expires_at && (
            <p className={`mt-0.5 text-[0.85rem] ${expired ? "font-medium text-[#a5432f]" : "text-ink/60"}`}>
              {expired ? "Expired" : "Ends"} {new Date(c.expires_at).toLocaleDateString("en-LK", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </button>
        <IconButton label={`Copy ${c.code}`} onClick={copy}>
          <CopyIcon className="size-5" />
        </IconButton>
      </div>
      <div className="border-t border-line px-4">
        <SwitchRow label={c.is_active ? "On" : "Paused"} checked={c.is_active} disabled={busy} onChange={toggle} />
      </div>
    </Card>
  );
}

export function PromoEditor({ id }: { id: string | null }) {
  const { data, source, run, back, go } = useAdmin();
  const existing = data.coupons.find((c) => c.id === id || c.code === id);
  const [code, setCode] = useState(existing?.code ?? "");
  const [type, setType] = useState<Coupon["discount_type"]>(existing?.discount_type ?? "percentage");
  const [value, setValue] = useState(existing ? String(num(existing.discount_value)) : "10");
  const [minOrder, setMinOrder] = useState(existing && num(existing.min_order_value) > 0 ? String(num(existing.min_order_value)) : "");
  const [cap, setCap] = useState(existing?.max_discount_amount ? String(num(existing.max_discount_amount)) : "");
  const [maxUses, setMaxUses] = useState(existing?.max_uses ? String(num(existing.max_uses)) : "");
  const [expires, setExpires] = useState(existing?.expires_at ? new Date(existing.expires_at).toISOString().slice(0, 10) : "");
  const [isPublic, setIsPublic] = useState(existing?.is_public !== false);
  const [firstOnly, setFirstOnly] = useState(Boolean(existing?.first_order_only));
  const [noSale, setNoSale] = useState(Boolean(existing?.exclude_sale_items));
  const [active, setActive] = useState(existing?.is_active !== false);
  const [cats, setCats] = useState<string[]>(existing?.allowed_categories ?? []);
  const [subs, setSubs] = useState<string[]>(existing?.allowed_subcategories ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subOptions = Array.from(new Set(data.categories.flatMap((c) => c.subcategories ?? [])));

  async function save() {
    const e: Record<string, string> = {};
    if (!/^[A-Z0-9_-]{2,40}$/.test(code)) e.code = "Use 2 to 40 letters or numbers, with no spaces.";
    if (data.coupons.some((c) => c.code === code && c.id !== existing?.id)) e.code = "You already have a code with this name.";
    if (type === "percentage" && (num(value) < 1 || num(value) > 100)) e.value = "Enter a percentage from 1 to 100.";
    if (type === "fixed" && num(value) <= 0) e.value = "Enter the amount to take off.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    setSaving(true);
    const ok = await run(
      () =>
        source.saveCoupon({
          id: existing?.id,
          code,
          discount_type: type,
          discount_value: type === "free_delivery" ? 0 : num(value),
          min_order_value: num(minOrder),
          max_discount_amount: type === "percentage" && cap ? num(cap) : null,
          max_uses: maxUses ? num(maxUses) : null,
          // Runs to the end of the chosen day, on the owner's clock.
          expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
          is_public: isPublic,
          first_order_only: firstOnly,
          exclude_sale_items: noSale,
          allowed_categories: cats,
          allowed_subcategories: subs,
          is_active: active,
        }),
      `${code} saved`,
    );
    setSaving(false);
    if (ok) back({ view: "promos" });
  }

  async function remove() {
    setSaving(true);
    const target = existing?.id || existing?.code || id;
    if (!target) {
      setSaving(false);
      return;
    }
    const ok = await run(() => source.deleteCoupon(target), `${existing?.code ?? code} deleted`);
    setSaving(false);
    if (ok) {
      setConfirmDelete(false);
      setTimeout(() => go({ view: "promos" }), 300);
    }
  }

  return (
    <>
      <TopBar
        title={existing ? "Edit promo code" : "New promo code"}
        onBack={() => back({ view: "promos" })}
        right={
          (existing?.id || existing?.code) && (
            <IconButton label="Delete promo code" onClick={() => setConfirmDelete(true)}>
              <TrashIcon className="size-5 text-[#a5432f]" />
            </IconButton>
          )
        }
      />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        <Card className="space-y-4 p-4">
          <Field label="Code" error={errors.code} hint="This is what customers type at checkout.">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="EID20"
              autoCapitalize="characters"
              autoCorrect="off"
              className="field font-mono tracking-wide uppercase"
            />
          </Field>
          <div>
            <p className="mb-1.5 text-[0.9rem] font-medium">Discount</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-mist p-1" role="group" aria-label="Discount type">
              {([["percentage", "% off"], ["fixed", "Rs. off"], ["free_delivery", "Free delivery"]] as const).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)} className={`min-h-11 rounded-lg px-1 text-[0.85rem] font-medium ${type === k ? "bg-ivory shadow-sm" : "text-ink/65"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {type !== "free_delivery" && (
            <Field label={type === "percentage" ? "Percentage off" : "Amount off"} error={errors.value}>
              <NumberInput value={value} onChange={setValue} prefix={type === "fixed" ? "Rs." : "%"} />
            </Field>
          )}
          <Field label="Minimum order (optional)">
            <NumberInput value={minOrder} onChange={setMinOrder} prefix="Rs." placeholder="No minimum" />
          </Field>
          {type === "percentage" && (
            <Field label="Biggest discount allowed (optional)">
              <NumberInput value={cap} onChange={setCap} prefix="Rs." placeholder="No limit" />
            </Field>
          )}
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold">Limits</h2>
          <Field label="Total uses (optional)">
            <NumberInput value={maxUses} onChange={setMaxUses} placeholder="Unlimited" />
          </Field>
          <Field label="Last day (optional)">
            <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} className="field" />
          </Field>
          <div className="divide-y divide-line">
            <SwitchRow label="Show to customers" hint="Off keeps it private, for influencers or VIPs." checked={isPublic} onChange={setIsPublic} />
            <SwitchRow label="First order only" checked={firstOnly} onChange={setFirstOnly} />
            <SwitchRow label="Skip sale items" checked={noSale} onChange={setNoSale} />
            <SwitchRow label="Code is on" checked={active} onChange={setActive} />
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">Works on</h2>
          <p className="mt-0.5 text-[0.85rem] text-ink/60">Leave these empty and it works on everything.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.categories.map((c) => {
              const on = cats.includes(c.slug);
              return (
                <button key={c.slug} type="button" aria-pressed={on} onClick={() => setCats(on ? cats.filter((x) => x !== c.slug) : [...cats, c.slug])} className={`min-h-11 rounded-full border px-4 text-[0.9rem] ${on ? "border-ink bg-ink text-ivory" : "border-line"}`}>
                  {c.name}
                </button>
              );
            })}
          </div>
          {subOptions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
              {subOptions.map((s) => {
                const on = subs.includes(s);
                return (
                  <button key={s} type="button" aria-pressed={on} onClick={() => setSubs(on ? subs.filter((x) => x !== s) : [...subs, s])} className={`min-h-11 rounded-full border px-4 text-[0.9rem] ${on ? "border-gold bg-gold/15 font-semibold" : "border-line"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <StickyBar>
        <button onClick={save} disabled={saving} className="btn btn-primary flex-1 text-[0.82rem]">{saving ? "Saving…" : existing ? "Save changes" : "Create promo code"}</button>
      </StickyBar>

      <AdminSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="delete this code?">
        <div className="p-5">
          <p className="leading-relaxed text-ink/75">Customers won’t be able to use {existing?.code} any more. To stop it for now and keep it for later, pause it instead.</p>
          <button onClick={remove} disabled={saving} className="btn mt-5 w-full bg-[#a5432f] text-ivory">{saving ? "Deleting…" : "Delete code"}</button>
        </div>
      </AdminSheet>
    </>
  );
}
