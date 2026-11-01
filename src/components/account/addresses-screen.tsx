"use client";

import { useState } from "react";
import { TrashIcon } from "@/components/admin/admin-icons";
import { AdminSheet, EmptyState, Field, SwitchRow } from "@/components/admin/ui";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { DISTRICTS } from "@/lib/catalog";
import { PencilIcon } from "./account-icons";
import { useAccount } from "./context";
import { ScreenTitle } from "./shell";
import type { AccountAddress, AddressInput } from "./types";

const LABELS = ["Home", "Office", "Family"];

const blank = (first: boolean, profileName: string, profilePhone: string): AddressInput => ({
  label: "Home",
  recipientName: profileName,
  phone: profilePhone,
  address: "",
  city: "",
  district: "",
  postalCode: "",
  isDefault: first,
});

const fromAddress = (a: AccountAddress): AddressInput => ({
  id: a.id,
  label: a.label,
  recipientName: a.recipient_name,
  phone: a.phone,
  address: a.address,
  city: a.city,
  district: a.district,
  postalCode: a.postal_code ?? "",
  isDefault: a.is_default,
});

export function AddressesScreen({ initial, profileName, profilePhone }: { initial: AccountAddress[]; profileName: string; profilePhone: string }) {
  const { api, toast } = useAccount();
  const [addresses, setAddresses] = useState(initial);
  const [form, setForm] = useState<AddressInput | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [removing, setRemoving] = useState<AccountAddress | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof AddressInput>(key: K, value: AddressInput[K]) => {
    setForm((f) => (f ? { ...f, [key]: value } : f));
    setErrors((e) => {
      const name = key === "postalCode" ? "postalCode" : key;
      return e[name] ? { ...e, [name]: "" } : e;
    });
  };

  function openEditor(next: AddressInput) {
    setForm(next);
    setErrors({});
    setEditorOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    const res = await api.saveAddress(form);
    setBusy(false);
    if (res.ok) {
      setAddresses(res.addresses);
      setEditorOpen(false);
      toast("Address saved");
    } else {
      setErrors(res.fields ?? {});
      if (!res.fields) toast(res.error, "err");
    }
  }

  async function makeDefault(id: string) {
    const res = await api.setDefaultAddress(id);
    if (res.ok) {
      setAddresses(res.addresses);
      toast("Default address updated");
    } else {
      toast(res.error, "err");
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(true);
    const res = await api.deleteAddress(removing.id);
    setBusy(false);
    if (res.ok) {
      setAddresses(res.addresses);
      setRemoveOpen(false);
      toast("Address removed");
    } else {
      toast(res.error, "err");
    }
  }

  const addButton = (
    <button type="button" onClick={() => openEditor(blank(addresses.length === 0, profileName, profilePhone))} className="btn btn-primary w-full text-[0.8rem]">
      <PlusIcon className="size-5" /> Add address
    </button>
  );

  return (
    <>
      <ScreenTitle title="addresses" subtitle={addresses.length > 0 ? "Your default address is filled in for you at checkout." : undefined} />
      <div className="mt-4 space-y-3 px-4 lg:px-0">
        {addresses.length === 0 ? (
          <EmptyState title="none saved yet" body="Save an address once, and checkout takes seconds next time." action={addButton} />
        ) : (
          <>
            {addresses.map((a) => (
              <section key={a.id} className={`rounded-[1.25rem] border bg-ivory ${a.is_default ? "border-sage-deep" : "border-line"}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-semibold">{a.label}</h2>
                    {a.is_default && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sage-soft px-2.5 py-1 text-[0.75rem] font-semibold text-sage-deep">
                        <CheckIcon className="size-3.5" /> Default
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-medium">{a.recipient_name}</p>
                  <p className="mt-0.5 leading-snug text-ink/70">{a.address}, {a.city}, {a.district} {a.postal_code ?? ""}</p>
                  <p className="mt-0.5 text-ink/70 tabular-nums">{a.phone}</p>
                </div>
                <div className="flex divide-x divide-line border-t border-line text-[0.9rem] font-medium">
                  <button type="button" onClick={() => openEditor(fromAddress(a))} className="flex min-h-12 flex-1 items-center justify-center gap-2">
                    <PencilIcon className="size-4" /> Edit
                  </button>
                  {!a.is_default && (
                    <button type="button" onClick={() => makeDefault(a.id)} className="min-h-12 flex-1">Make default</button>
                  )}
                  <button type="button" onClick={() => { setRemoving(a); setRemoveOpen(true); }} className="flex min-h-12 flex-1 items-center justify-center gap-2 text-[#a5432f]">
                    <TrashIcon className="size-4" /> Remove
                  </button>
                </div>
              </section>
            ))}
            {addButton}
          </>
        )}
      </div>

      <AdminSheet open={editorOpen} onClose={() => setEditorOpen(false)} title={form?.id ? "edit address" : "new address"}>
        {form && (
          <form onSubmit={save} noValidate className="space-y-4 p-5 pb-8">
            <div>
              <p className="mb-1.5 text-[0.9rem] font-medium">Save as</p>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...LABELS, form.label])).filter(Boolean).map((l) => (
                  <button key={l} type="button" aria-pressed={form.label === l} onClick={() => set("label", l)} className={`min-h-11 rounded-full border px-4 text-[0.9rem] font-medium ${form.label === l ? "border-ink bg-ink text-ivory" : "border-line"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Who is it for?" error={errors.recipientName}>
              <input value={form.recipientName} onChange={(e) => set("recipientName", e.target.value)} autoComplete="name" autoCapitalize="words" enterKeyHint="next" className="field" />
            </Field>
            <Field label="Mobile number" error={errors.phone}>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" enterKeyHint="next" className="field" />
            </Field>
            <Field label="House number and street" error={errors.address}>
              <input value={form.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" autoCapitalize="words" placeholder="No. 12, Galle Road" enterKeyHint="next" className="field" />
            </Field>
            <Field label="City or town" error={errors.city}>
              <input value={form.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" autoCapitalize="words" enterKeyHint="next" className="field" />
            </Field>
            <Field label="District" error={errors.district}>
              <select value={form.district} onChange={(e) => set("district", e.target.value)} autoComplete="address-level1" className="field">
                <option value="" disabled>Choose your district</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Postal code (optional)" error={errors.postalCode}>
              <input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value.replace(/\D/g, "").slice(0, 5))} inputMode="numeric" autoComplete="postal-code" enterKeyHint="done" className="field" />
            </Field>
            <SwitchRow label="Use as my default" checked={form.isDefault} onChange={(v) => set("isDefault", v)} />
            <button type="submit" disabled={busy} className="btn btn-primary w-full">{busy ? "Saving…" : "Save address"}</button>
          </form>
        )}
      </AdminSheet>

      <AdminSheet open={removeOpen} onClose={() => setRemoveOpen(false)} title="remove this address?">
        <div className="p-5 pb-8">
          <p className="leading-relaxed text-ink/75">{removing ? `${removing.label}: ${removing.address}, ${removing.city}. ` : ""}Orders already placed aren’t affected.</p>
          <button type="button" onClick={remove} disabled={busy} className="btn mt-5 w-full bg-[#a5432f] text-ivory">{busy ? "Removing…" : "Remove address"}</button>
          <button type="button" onClick={() => setRemoveOpen(false)} disabled={busy} className="btn btn-ghost mt-2.5 w-full">Keep address</button>
        </div>
      </AdminSheet>
    </>
  );
}
