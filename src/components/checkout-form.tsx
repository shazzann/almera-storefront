"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getPublicCouponsAction, placeOrderAction } from "@/actions/orders";
import { DELIVERY, DISTRICTS, formatLKR, type DeliveryMethod } from "@/lib/catalog";
import { cart, linePrice, totals, useCart, type CartLine } from "@/lib/cart";
import {
  COD_DEPOSIT_BANK,
  COD_DEPOSIT_THRESHOLD,
  COD_MIN_DEPOSIT,
  requiresCodDeposit,
} from "@/lib/cod-deposit";
import type { PublicCouponSummary } from "@/lib/coupons.server";
import { BANK_DETAILS } from "@/lib/whatsapp";
import { WardrobeMark } from "./brand";

type Payment = "cod" | "bank";
type Form = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  note: string;
};
const EMPTY_FORM: Form = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  district: "",
  note: "",
};

export type PlacedOrder = {
  number: string;
  name: string;
  phone: string;
  address: string;
  district: string;
  method: DeliveryMethod;
  payment: Payment;
  lines: CartLine[];
  subtotal?: number;
  delivery?: number;
  couponCode?: string | null;
  discountAmount?: number;
  total: number;
};

const PHONE = /^(?:\+94|0)?7\d{8}$/;

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name.";
  if (!PHONE.test(f.phone.replace(/[\s-]/g, "")))
    e.phone = "Enter a Sri Lankan mobile number, like 077 123 4567.";
  if (f.email && !/^\S+@\S+\.\S+$/.test(f.email))
    e.email = "Enter a valid email, or leave it blank.";
  if (f.address.trim().length < 5) e.address = "Enter your house number and street.";
  if (!f.city.trim()) e.city = "Enter your city or town.";
  if (!f.district) e.district = "Choose your district.";
  return e;
}

export function CheckoutForm() {
  const router = useRouter();
  const { lines, appliedCoupon, couponChecking, couponNotice, hydrated } = useCart();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [method, setMethod] = useState<DeliveryMethod>("standard");
  const [payment, setPayment] = useState<Payment>("cod");
  const [placing, setPlacing] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [publicCoupons, setPublicCoupons] = useState<PublicCouponSummary[]>([]);

  // Idempotency key generated lazily on first submission attempt
  const idempotencyKeyRef = useRef<string | null>(null);

  const t = totals(lines, method, appliedCoupon);
  const discountAmount = t.discountAmount;
  const finalTotal = t.total;

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    getPublicCouponsAction()
      .then(setPublicCoupons)
      .catch(() => {});
  }, [hydrated, lines.length]);

  // Re-validate first_order_only coupons when the customer enters their phone or email
  useEffect(() => {
    if (!appliedCoupon?.firstOrderOnly) return;
    const cleanPhone = form.phone.replace(/[\s-]/g, "");
    const validPhone = PHONE.test(cleanPhone);
    const validEmail = form.email && /^\S+@\S+\.\S+$/.test(form.email);
    if (!validPhone && !validEmail) return;

    const timer = setTimeout(() => {
      cart
        .applyCoupon(appliedCoupon.code, {
          phone: validPhone ? form.phone.trim() : undefined,
          email: validEmail ? form.email.trim() : undefined,
        })
        .catch((err) => {
          cart.removeCoupon();
          setCouponError(
            err instanceof Error
              ? err.message
              : "This promo code is only valid for your first order.",
          );
        });
    }, 450);

    return () => clearTimeout(timer);
  }, [appliedCoupon?.code, appliedCoupon?.firstOrderOnly, form.phone, form.email]);

  const set =
    (k: keyof Form) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setForm((f) => ({ ...f, [k]: e.target.value }));
        if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
        if (serverError) setServerError(null);
      };

  async function applyCoupon(codeOverride?: string) {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponError(null);
    cart.clearCouponNotice();
    try {
      await cart.applyCoupon(code, {
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
      setCouponInput("");
    } catch (err) {
      setCouponError(err instanceof Error ? err.message : "Invalid promo code.");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const found = validate(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      document.getElementById(`f-${first}`)?.focus();
      return;
    }
    setPlacing(true);
    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `00000000-0000-4000-8000-${String(Date.now()).padStart(12, "0").slice(-12)}`;
      }
      const result = await placeOrderAction({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim(),
        city: form.city.trim(),
        district: form.district,
        note: form.note.trim() || null,
        payment_method: payment,
        coupon_code: appliedCoupon?.code ?? null,
        idempotency_key: idempotencyKeyRef.current,
        items: lines.map((l) => ({
          slug: l.slug,
          stitching: l.stitching,
          size: l.size ?? null,
          quantity: l.qty,
        })),
      });

      const order: PlacedOrder = {
        number: result.order_number,
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: `${form.address.trim()}, ${form.city.trim()}`,
        district: form.district,
        method,
        payment,
        lines,
        subtotal: result.subtotal,
        delivery: result.delivery_fee,
        couponCode: result.coupon_code,
        discountAmount: result.discount_amount,
        total: result.total,
      };
      try {
        sessionStorage.setItem("almera.lastOrder", JSON.stringify(order));
      } catch { }
      cart.clear();
      setForm(EMPTY_FORM);
      router.push("/order-confirmed");
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not place your order. Please try again.",
      );
      setPlacing(false);
    }
  }

  if (hydrated && lines.length === 0 && !placing) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <WardrobeMark className="h-20 w-auto text-gold" />
        <h1 className="display mt-6 text-4xl">your bag is empty</h1>
        <p className="mt-3 text-ink/65">Add a piece or two, then come back here to check out.</p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Shop new arrivals
        </Link>
      </div>
    );
  }

  const summary = (
    <div>
      <ul className="divide-y divide-line">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-4 py-4">
            <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-sage-soft">
              {l.image && <Image src={l.image} alt="" fill sizes="64px" className="object-cover" />}
              <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-ink text-[0.65rem] font-semibold text-ivory">
                {l.qty}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{l.name}</span>
              <span className="block text-xs text-ink/55 capitalize">
                {l.stitching}
                {l.size && ` · ${l.size}`}
              </span>
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatLKR(linePrice(l) * l.qty)}
            </span>
          </li>
        ))}
      </ul>

      {/* Promo / Coupon Code */}
      <div className="mt-3 border-t border-line pt-4">
        {appliedCoupon ? (
          <div className="flex items-center justify-between rounded-xl bg-sage-soft/70 px-3.5 py-2.5 text-sm">
            <span>
              <strong className="font-semibold tracking-wider uppercase">
                {appliedCoupon.code}
              </strong>{" "}
              <span className="text-ink/70">({appliedCoupon.label})</span>
            </span>
            <button
              type="button"
              onClick={() => {
                cart.removeCoupon();
                setCouponInput("");
                setCouponError(null);
              }}
              className="text-xs underline underline-offset-4 hover:text-ink"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => {
                  setCouponInput(e.target.value.toUpperCase());
                  if (couponError) setCouponError(null);
                }}
                placeholder="Promo code (e.g. ALMERA10)"
                aria-label="Promo code"
                className="field flex-1 py-2 text-sm uppercase"
              />
              <button
                type="button"
                onClick={() => applyCoupon()}
                disabled={couponChecking || !couponInput.trim()}
                className="btn btn-ghost shrink-0 px-4 py-2 text-sm"
              >
                {couponChecking ? "Checking…" : "Apply"}
              </button>
            </div>
            {publicCoupons.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {publicCoupons.map((pc) => (
                  <button
                    key={pc.code}
                    type="button"
                    disabled={couponChecking}
                    onClick={() => applyCoupon(pc.code)}
                    className="rounded-full border border-line bg-mist/60 px-2.5 py-1 text-xs font-medium text-ink/75 transition hover:border-ink hover:text-ink"
                  >
                    <span className="font-mono font-semibold">{pc.code}</span> ·{" "}
                    {pc.discount_type === "percentage"
                      ? `${pc.discount_value}% off`
                      : pc.discount_type === "free_delivery"
                        ? "Free delivery"
                        : `Rs. ${pc.discount_value.toLocaleString("en-LK")} off`}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {(couponError || couponNotice) && (
          <p className="mt-1.5 text-xs text-[#a5432f]" role="alert">
            {couponError ?? couponNotice}
          </p>
        )}
      </div>

      <dl className="mt-3 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink/65">Subtotal</dt>
          <dd className="tabular-nums">{formatLKR(t.subtotal)}</dd>
        </div>
        {appliedCoupon && discountAmount > 0 && !t.isFreeDeliveryCoupon && (
          <div className="flex justify-between text-sage-deep">
            <dt>Discount ({appliedCoupon.code})</dt>
            <dd className="tabular-nums">−{formatLKR(discountAmount)}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-ink/65">Delivery</dt>
          <dd className="tabular-nums">
            {t.isFreeDeliveryCoupon && t.baseDelivery > 0 ? (
              <span>
                <s className="mr-1.5 text-ink/40">{formatLKR(t.baseDelivery)}</s>
                <span className="font-semibold text-sage-deep">Free</span>
              </span>
            ) : t.delivery === 0 ? (
              "Free"
            ) : (
              formatLKR(t.delivery)
            )}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatLKR(finalTotal)}</dd>
        </div>
        {requiresCodDeposit(payment, finalTotal) && (
          <div className="mt-2 space-y-1 rounded-xl bg-gold/15 p-3 text-xs">
            <div className="flex justify-between font-medium text-gold-deep">
              <span>Advance deposit due now (min.)</span>
              <span className="tabular-nums">{formatLKR(COD_MIN_DEPOSIT)}</span>
            </div>
            <div className="flex justify-between text-ink/75">
              <span>Remaining COD balance on delivery</span>
              <span className="font-semibold tabular-nums">
                {formatLKR(Math.max(0, finalTotal - COD_MIN_DEPOSIT))}
              </span>
            </div>
          </div>
        )}
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
          <span className="font-semibold tabular-nums">{formatLKR(finalTotal)}</span>
        </summary>
        <div className="px-4 pb-5">{summary}</div>
      </details>

      <form onSubmit={submit} noValidate className="space-y-10 px-4 py-8 sm:px-6 lg:px-0 lg:py-0">
        <h1 className="display text-5xl">checkout</h1>

        {serverError && (
          <div
            role="alert"
            className="rounded-2xl border border-[#a5432f]/30 bg-[#a5432f]/10 px-4 py-3.5 text-sm text-[#a5432f]"
          >
            {serverError}
          </div>
        )}

        <Section title="Contact">
          <Field id="name" label="Full name" error={errors.name}>
            <input
              id="f-name"
              value={form.name}
              onChange={set("name")}
              autoComplete="name"
              className="field"
              aria-invalid={!!errors.name}
            />
          </Field>
          <Field
            id="phone"
            label="Mobile number"
            hint="We’ll call or WhatsApp you on this number to confirm your order."
            error={errors.phone}
          >
            <input
              id="f-phone"
              value={form.phone}
              onChange={set("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="077 123 4567"
              className="field"
              aria-invalid={!!errors.phone}
            />
          </Field>
          <Field id="email" label="Email (optional)" error={errors.email}>
            <input
              id="f-email"
              value={form.email}
              onChange={set("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              className="field"
              aria-invalid={!!errors.email}
            />
          </Field>
        </Section>

        <Section title="Delivery address">
          <Field id="address" label="House number and street" error={errors.address}>
            <input
              id="f-address"
              value={form.address}
              onChange={set("address")}
              autoComplete="street-address"
              className="field"
              aria-invalid={!!errors.address}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="city" label="City or town" error={errors.city}>
              <input
                id="f-city"
                value={form.city}
                onChange={set("city")}
                autoComplete="address-level2"
                className="field"
                aria-invalid={!!errors.city}
              />
            </Field>
            <Field id="district" label="District" error={errors.district}>
              <select
                id="f-district"
                value={form.district}
                onChange={set("district")}
                className="field appearance-none"
                aria-invalid={!!errors.district}
              >
                <option value="">Choose a district</option>
                {DISTRICTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Delivery method">
          <div className="space-y-2.5">
            {(Object.keys(DELIVERY) as DeliveryMethod[]).map((m) => {
              const d = DELIVERY[m];
              const free = t.freeDelivery;
              return (
                <Choice
                  key={m}
                  name="method"
                  checked={method === m}
                  onChange={() => setMethod(m)}
                  title={d.label}
                  sub={d.eta}
                  right={free ? "Free" : formatLKR(d.fee)}
                />
              );
            })}
          </div>
        </Section>

        <Section title="Payment">
          <div className="space-y-2.5">
            <Choice
              name="payment"
              checked={payment === "cod"}
              onChange={() => setPayment("cod")}
              title="Cash on delivery"
              sub={
                finalTotal > COD_DEPOSIT_THRESHOLD
                  ? `Pay ${formatLKR(COD_MIN_DEPOSIT)} advance commitment deposit via bank transfer; pay the remaining ${formatLKR(Math.max(0, finalTotal - COD_MIN_DEPOSIT))} in cash to the courier on delivery.`
                  : "Pay the courier in cash when your parcel arrives."
              }
            />
            <Choice
              name="payment"
              checked={payment === "bank"}
              onChange={() => setPayment("bank")}
              title="Bank transfer"
              sub="Transfer to our bank account and share your slip on WhatsApp. Your order is dispatched once the payment slip is received."
            />
          </div>
          {requiresCodDeposit(payment, finalTotal) && (
            <div className="mt-3 rounded-2xl border border-gold/45 bg-ivory p-4 text-sm">
              <p className="eyebrow text-gold-deep">
                COD Advance Deposit Required (Orders above {formatLKR(COD_DEPOSIT_THRESHOLD)})
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-ink/75">
                For Cash on Delivery orders over {formatLKR(COD_DEPOSIT_THRESHOLD)}, a minimum{" "}
                <strong>{formatLKR(COD_MIN_DEPOSIT)} advance deposit</strong> via bank transfer is
                required to confirm dispatch. You will pay the remaining{" "}
                <strong>{formatLKR(Math.max(0, finalTotal - COD_MIN_DEPOSIT))}</strong> in cash when
                the courier delivers your parcel.
              </p>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                <dt className="text-ink/60">Bank</dt>
                <dd className="font-medium">{COD_DEPOSIT_BANK.bank}</dd>
                <dt className="text-ink/60">Account name</dt>
                <dd className="font-medium">{COD_DEPOSIT_BANK.accountName}</dd>
                <dt className="text-ink/60">Account number</dt>
                <dd className="font-mono font-semibold">{COD_DEPOSIT_BANK.accountNumber}</dd>
                <dt className="text-ink/60">Branch</dt>
                <dd className="font-medium">{COD_DEPOSIT_BANK.branch}</dd>
              </dl>
            </div>
          )}
          {payment === "bank" && (
            <div className="mt-3 rounded-2xl border border-line bg-ivory p-4 text-sm">
              <p className="eyebrow text-gold-deep">Bank account details</p>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt className="text-ink/60">Bank</dt>
                <dd className="font-medium">{BANK_DETAILS.bankName}</dd>
                <dt className="text-ink/60">Account name</dt>
                <dd className="font-medium">{BANK_DETAILS.accountName}</dd>
                <dt className="text-ink/60">Account number</dt>
                <dd className="font-mono font-semibold">{BANK_DETAILS.accountNumber}</dd>
                <dt className="text-ink/60">Branch</dt>
                <dd className="font-medium">{BANK_DETAILS.branch}</dd>
              </dl>
            </div>
          )}
        </Section>

        <Section title="Anything we should know?">
          <textarea
            id="f-note"
            value={form.note}
            onChange={set("note")}
            rows={3}
            placeholder="Delivery instructions or stitching notes (optional)"
            className="field resize-none"
          />
        </Section>

        <div className="rounded-2xl bg-sage-soft/70 px-4 py-3.5 text-sm leading-relaxed">
          All sales are final: no exchanges, returns or refunds. By placing your order you confirm
          you’ve checked the sizing.
        </div>

        <button type="submit" disabled={placing} className="btn btn-primary w-full">
          {placing ? "Placing your order…" : `Place order · ${formatLKR(finalTotal)}`}
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

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`f-${id}`} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-[#a5432f]" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-ink/55">{hint}</p>
      )}
    </div>
  );
}

function Choice({
  name,
  checked,
  onChange,
  title,
  sub,
  right,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  sub: string;
  right?: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3.5 rounded-2xl border p-4 transition ${checked ? "border-ink bg-ivory" : "border-line bg-ivory/50 hover:border-ink/40"
        }`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border transition peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold ${checked ? "border-ink" : "border-ink/30"
          }`}
      >
        <span
          className={`size-2.5 rounded-full bg-ink transition ${checked ? "scale-100" : "scale-0"
            }`}
        />
      </span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-ink/60">{sub}</span>
      </span>
      {right && <span className="text-sm font-semibold tabular-nums">{right}</span>}
    </label>
  );
}
