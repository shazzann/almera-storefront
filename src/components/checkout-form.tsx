"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DELIVERY, DISTRICTS, formatLKR, getProduct, type DeliveryMethod } from "@/lib/catalog";
import { cart, linePrice, totals, useCart, type CartLine } from "@/lib/cart";
import { WardrobeMark } from "./brand";

type Payment = "cod" | "bank";
type Form = { name: string; phone: string; email: string; address: string; city: string; district: string; note: string };
const EMPTY_FORM: Form = { name: "", phone: "", email: "", address: "", city: "", district: "", note: "" };

export type PlacedOrder = {
  number: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  method: DeliveryMethod;
  payment: Payment;
  lines: CartLine[];
  total: number;
};

const newOrderNumber = () => `ALM-${Math.floor(10000 + Math.random() * 89999)}`;

const PHONE = /^(?:\+94|0)?7\d{8}$/;

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name.";
  if (!PHONE.test(f.phone.replace(/[\s-]/g, ""))) e.phone = "Enter a Sri Lankan mobile number, like 077 123 4567.";
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email, or leave it blank.";
  if (f.address.trim().length < 5) e.address = "Enter your house number and street.";
  if (!f.city.trim()) e.city = "Enter your city or town.";
  if (!f.district) e.district = "Choose your district.";
  return e;
}

export function CheckoutForm() {
  const router = useRouter();
  const { lines, hydrated } = useCart();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [method, setMethod] = useState<DeliveryMethod>("standard");
  const [payment, setPayment] = useState<Payment>("cod");
  const [placing, setPlacing] = useState(false);
  const t = totals(lines, method);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setPlacing(true);
    // Demo only: a real build would send this to the order API.
    await new Promise((r) => setTimeout(r, 900));
    const order: PlacedOrder = {
      number: newOrderNumber(),
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: `${form.address.trim()}, ${form.city.trim()}`,
      district: form.district,
      method,
      payment,
      lines,
      total: t.total,
    };
    try {
      sessionStorage.setItem("almera.lastOrder", JSON.stringify(order));
    } catch {}
    cart.clear();
    setForm(EMPTY_FORM);
    setPlacing(false);
    router.push("/order-confirmed");
  }

  if (hydrated && lines.length === 0 && !placing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <WardrobeMark className="h-20 w-auto text-gold" />
        <h1 className="display mt-6 text-4xl">your bag is empty</h1>
        <p className="mt-3 text-ink/65">Add a piece or two, then come back here to check out.</p>
        <Link href="/shop" className="btn btn-primary mt-8">Shop new arrivals</Link>
      </div>
    );
  }

  const summary = (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((l) => {
          const p = getProduct(l.slug)!;
          return (
            <li key={l.key} className="flex items-center gap-4 py-4">
              <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-sage-soft">
                <Image src={p.images[0]} alt="" fill sizes="64px" className="object-cover" />
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-[0.65rem] font-semibold text-ivory">{l.qty}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{p.name}</span>
                <span className="block text-xs text-ink/55 capitalize">{l.stitching}{l.size && ` · ${l.size}`}</span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatLKR(linePrice(l) * l.qty)}</span>
            </li>
          );
        })}
      </ul>
      <dl className="mt-2 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between"><dt className="text-ink/65">Subtotal</dt><dd className="tabular-nums">{formatLKR(t.subtotal)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink/65">Delivery</dt><dd className="tabular-nums">{t.delivery === 0 ? "Free" : formatLKR(t.delivery)}</dd></div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatLKR(t.total)}</dd></div>
      </dl>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-[1fr_24rem] lg:gap-14 lg:px-6 lg:py-12">
      {/* Phones: collapsible summary at the top */}
      <details className="group border-b border-line bg-ivory lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-sm [&::-webkit-details-marker]:hidden">
          <span className="font-medium text-sage-deep">
            <span className="group-open:hidden">Show order summary</span>
            <span className="hidden group-open:inline">Hide order summary</span>
          </span>
          <span className="font-semibold tabular-nums">{formatLKR(t.total)}</span>
        </summary>
        <div className="px-4 pb-5">{summary}</div>
      </details>

      <form onSubmit={submit} noValidate className="space-y-10 px-4 py-8 sm:px-6 lg:px-0 lg:py-0">
        <h1 className="display text-5xl">checkout</h1>

        <Section title="Contact">
          <Field id="name" label="Full name" error={errors.name}>
            <input id="f-name" value={form.name} onChange={set("name")} autoComplete="name" className="field" aria-invalid={!!errors.name} />
          </Field>
          <Field id="phone" label="Mobile number" hint="We’ll call or WhatsApp you on this number to confirm your order." error={errors.phone}>
            <input id="f-phone" value={form.phone} onChange={set("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder="077 123 4567" className="field" aria-invalid={!!errors.phone} />
          </Field>
          <Field id="email" label="Email (optional)" error={errors.email}>
            <input id="f-email" value={form.email} onChange={set("email")} type="email" inputMode="email" autoComplete="email" className="field" aria-invalid={!!errors.email} />
          </Field>
        </Section>

        <Section title="Delivery address">
          <Field id="address" label="House number and street" error={errors.address}>
            <input id="f-address" value={form.address} onChange={set("address")} autoComplete="street-address" className="field" aria-invalid={!!errors.address} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="city" label="City or town" error={errors.city}>
              <input id="f-city" value={form.city} onChange={set("city")} autoComplete="address-level2" className="field" aria-invalid={!!errors.city} />
            </Field>
            <Field id="district" label="District" error={errors.district}>
              <select id="f-district" value={form.district} onChange={set("district")} className="field appearance-none" aria-invalid={!!errors.district}>
                <option value="">Choose a district</option>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Delivery method">
          <div className="space-y-2.5">
            {(Object.keys(DELIVERY) as DeliveryMethod[]).map((m) => {
              const d = DELIVERY[m];
              const free = m === "standard" && t.freeDelivery;
              return (
                <Choice key={m} name="method" checked={method === m} onChange={() => setMethod(m)} title={d.label} sub={d.eta} right={free ? "Free" : formatLKR(d.fee)} />
              );
            })}
          </div>
        </Section>

        <Section title="Payment">
          <div className="space-y-2.5">
            <Choice name="payment" checked={payment === "cod"} onChange={() => setPayment("cod")} title="Cash on delivery" sub="Pay the courier in cash when your parcel arrives." />
            <Choice name="payment" checked={payment === "bank"} onChange={() => setPayment("bank")} title="Bank transfer" sub="We’ll send our bank details on WhatsApp. Your order is dispatched once the payment slip is received." />
          </div>
        </Section>

        <Section title="Anything we should know?">
          <textarea id="f-note" value={form.note} onChange={set("note")} rows={3} placeholder="Delivery instructions or stitching notes (optional)" className="field resize-none" />
        </Section>

        <div className="rounded-2xl bg-sage-soft/70 px-4 py-3.5 text-sm leading-relaxed">
          All sales are final: no exchanges, returns or refunds. By placing your order you confirm you’ve checked the sizing.
        </div>

        <button type="submit" disabled={placing} className="btn btn-primary w-full">
          {placing ? "Placing your order…" : `Place order · ${formatLKR(t.total)}`}
        </button>
      </form>

      <aside className="hidden lg:block">
        <div className="sticky top-8 rounded-[1.5rem] bg-ivory p-6">
          <h2 className="eyebrow text-ink/55">Order summary</h2>
          {summary}
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="eyebrow mb-4 text-gold-deep">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-[#a5432f]" role="alert">{error}</p> : hint && <p className="mt-1.5 text-xs text-ink/55">{hint}</p>}
    </div>
  );
}

function Choice({ name, checked, onChange, title, sub, right }: { name: string; checked: boolean; onChange: () => void; title: string; sub: string; right?: string }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition ${checked ? "border-ink bg-ivory" : "border-line bg-ivory/50 hover:border-ink/40"}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${checked ? "border-ink" : "border-ink/30"}`}>
        <span className={`size-2.5 rounded-full bg-ink transition ${checked ? "scale-100" : "scale-0"}`} />
      </span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink/60">{sub}</span>
      </span>
      {right && <span className="text-sm font-semibold tabular-nums">{right}</span>}
    </label>
  );
}
