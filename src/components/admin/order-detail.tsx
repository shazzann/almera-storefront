"use client";

import Image from "@/components/image";
import { useState } from "react";
import { CheckIcon, WhatsAppIcon } from "@/components/icons";
import { formatLKR } from "@/lib/catalog";
import { COD_MIN_DEPOSIT, getCodBalanceDue } from "@/lib/cod-deposit";
import { useAdmin } from "./admin-app";
import { MoreIcon, PhoneIcon, PrintIcon } from "./admin-icons";
import {
  STATUS_CHOICES,
  STATUS_LABEL,
  needsDeposit,
  nextStep,
  num,
  orderWhatsAppText,
  printPackingSlip,
  timeAgo,
  whatsappUrl,
  type Order,
  type OrderStatus,
} from "./lib";
import { AdminSheet, Card, EmptyState, Field, IconButton, NumberInput, StatusPill, StickyBar, SwitchRow, TopBar } from "./ui";

type SheetName = "deposit" | "refund" | "status" | "cancel" | "next" | "actions" | null;

const PAYMENT_LABEL: Record<string, string> = { cod: "Cash on delivery", bank: "Bank transfer", card: "Card" };

export function OrderDetail({ id }: { id: string | null }) {
  const { data, back, source, run, toast } = useAdmin();
  const [sheet, setSheet] = useState<SheetName>(null);
  const [pickedStatus, setPickedStatus] = useState<OrderStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const order = data.orders.find((o) => o.id === id);
  const close = () => setSheet(null);

  if (!order) {
    return (
      <>
        <TopBar title="Order" onBack={() => back({ view: "orders" })} />
        <div className="mx-auto max-w-3xl p-4">
          <EmptyState title="order not found" body="It may be older than the latest 100 orders shown here." />
        </div>
      </>
    );
  }

  const step = nextStep(order);
  const balance = getCodBalanceDue(order);
  const canCancel = !["cancelled", "refunded", "delivered"].includes(order.status);
  const canRefund = num(order.refund_amount) < num(order.total) && !["payment_pending", "payment_processing", "processing_failed"].includes(order.status);

  async function changeStatus(next: OrderStatus, message: string) {
    setBusy(true);
    const ok = await run(() => source.setOrderStatus(order!.id, next), message);
    setBusy(false);
    if (ok) {
      setPickedStatus(null);
      close();
    }
  }

  return (
    <>
      <TopBar
        title={order.order_number}
        subtitle={timeAgo(order.created_at)}
        onBack={() => back({ view: "orders" })}
        right={
          <IconButton label="More actions" onClick={() => setSheet("actions")}>
            <MoreIcon className="size-6" />
          </IconButton>
        }
      />

      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        <Progress order={order} onChange={() => setSheet("status")} />

        <Card className="p-4">
          <p className="text-[1.15rem] font-semibold">{order.customer_name}</p>
          <p className="mt-1 leading-snug text-ink/70">
            {order.address}, {order.city}, {order.district}
          </p>
          <p className="mt-1 text-ink/70 tabular-nums">{order.phone}</p>
          {order.email && <p className="mt-0.5 truncate text-[0.9rem] text-ink/60">{order.email}</p>}
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl bg-mist text-[0.82rem] font-medium">
              <PhoneIcon className="size-5" /> Call
            </a>
            <a href={whatsappUrl(order.phone, orderWhatsAppText(order))} target="_blank" rel="noreferrer" className="flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl bg-mist text-[0.82rem] font-medium">
              <WhatsAppIcon className="size-5" /> WhatsApp
            </a>
            <button onClick={() => { if (!printPackingSlip(order)) toast("Allow pop-ups for this site to print.", "err"); }} className="flex min-h-[3.75rem] flex-col items-center justify-center gap-1 rounded-xl bg-mist text-[0.82rem] font-medium">
              <PrintIcon className="size-5" /> Print slip
            </button>
          </div>
          {order.notes && (
            <p className="mt-3 rounded-xl bg-gold/15 px-3.5 py-2.5 text-[0.92rem] leading-snug">
              <strong className="font-semibold">Note:</strong> {order.notes}
            </p>
          )}
        </Card>

        <Card className="divide-y divide-line">
          {(order.order_items ?? []).map((it) => (
            <div key={it.id} className="flex gap-3 p-3.5">
              <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-sage-soft">
                <Image src={it.image_url || "/placeholder.svg"} alt={it.product_name || ""} fill sizes="64px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block leading-snug font-medium">{it.product_name}</span>
                <span className="mt-1 block text-[0.88rem] text-ink/65 capitalize">
                  {it.stitching}
                  {it.size && it.size !== "-" ? ` · Size ${it.size}` : ""}
                </span>
                <span className="mt-1 block text-[0.88rem] text-ink/65 tabular-nums">Qty {num(it.quantity)}</span>
              </span>
              <span className="font-semibold tabular-nums">{formatLKR(num(it.unit_price) * num(it.quantity))}</span>
            </div>
          ))}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Payment</h2>
            <span className="text-[0.9rem] text-ink/65">{PAYMENT_LABEL[order.payment_method] ?? order.payment_method}</span>
          </div>
          <dl className="mt-3 space-y-1.5 text-[0.95rem] tabular-nums">
            <Row label="Subtotal" value={formatLKR(num(order.subtotal))} />
            {num(order.discount_amount) > 0 && <Row label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`} value={`−${formatLKR(num(order.discount_amount))}`} />}
            <Row label="Delivery" value={num(order.delivery_fee) === 0 ? "Free" : formatLKR(num(order.delivery_fee))} />
            <Row label="Total" value={formatLKR(num(order.total))} strong />
            {num(order.advance_deposit) > 0 && <Row label="Deposit paid" value={`−${formatLKR(num(order.advance_deposit))}`} />}
            {num(order.refund_amount) > 0 && <Row label="Refunded" value={`−${formatLKR(num(order.refund_amount))}`} />}
          </dl>
          {order.payment_method !== "card" && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-sage-soft/60 px-3.5 py-3">
              <span className="font-medium">To collect on delivery</span>
              <span className="text-lg font-semibold tabular-nums">{formatLKR(balance)}</span>
            </div>
          )}
          {order.bank_slip_reference && <p className="mt-2.5 text-[0.88rem] text-ink/65">Slip reference: {order.bank_slip_reference}</p>}
          {order.advance_deposit_note && <p className="mt-1 text-[0.88rem] text-ink/65">{order.advance_deposit_note}</p>}
          {order.refund_reason && <p className="mt-1 text-[0.88rem] text-ink/65">Refund reason: {order.refund_reason}</p>}
          {order.payment_method !== "card" && (!step || step.kind !== "deposit") && !["cancelled", "refunded"].includes(order.status) && (
            <button onClick={() => setSheet("deposit")} className="mt-3 min-h-11 text-[0.92rem] font-medium text-sage-deep underline underline-offset-4">
              {num(order.advance_deposit) > 0 ? "Change recorded payment" : "Record a payment"}
            </button>
          )}
        </Card>
      </div>

      <StickyBar>
        {step ? (
          <button onClick={() => setSheet(step.kind === "deposit" ? "deposit" : "next")} className="btn btn-primary flex-1 text-[0.82rem]">
            {step.label}
          </button>
        ) : (
          <button onClick={() => setSheet("actions")} className="btn btn-ghost flex-1 text-[0.82rem]">Order options</button>
        )}
      </StickyBar>

      <AdminSheet open={sheet === "next"} onClose={close} title={step?.label.toLowerCase() ?? "update"}>
        {step?.kind === "status" && (
          <ConfirmBody
            body={`${step.body}${order.email ? " The customer gets an email update." : ""}`}
            busy={busy}
            confirm={step.label}
            onConfirm={() => changeStatus(step.next, `${order.order_number} is now ${STATUS_LABEL[step.next]}`)}
          />
        )}
      </AdminSheet>

      <AdminSheet open={sheet === "deposit"} onClose={close} title={order.payment_method === "cod" ? "record deposit" : "record payment"}>
        <DepositForm order={order} onDone={close} />
      </AdminSheet>

      <AdminSheet open={sheet === "refund"} onClose={close} title="refund">
        <RefundForm order={order} onDone={close} />
      </AdminSheet>

      <AdminSheet open={sheet === "cancel"} onClose={close} title="cancel order?">
        <ConfirmBody
          danger
          body={`This cancels ${order.order_number} and puts its pieces back in stock.${order.email ? " The customer gets an email update." : ""}`}
          busy={busy}
          confirm="Cancel order"
          onConfirm={() => changeStatus("cancelled", `${order.order_number} cancelled`)}
        />
      </AdminSheet>

      <AdminSheet open={sheet === "status"} onClose={() => { close(); setPickedStatus(null); }} title="change status">
        <div className="p-3 pb-6">
          {STATUS_CHOICES.map((c) => {
            const current = order.status === c.status;
            return (
              <button
                key={c.status}
                onClick={() => setPickedStatus(c.status)}
                disabled={current}
                className={`flex min-h-16 w-full items-center gap-3 rounded-xl px-3 text-left ${pickedStatus === c.status ? "bg-sage-soft" : ""}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.title}{current && <span className="font-normal text-ink/55"> · current</span>}</span>
                  <span className="mt-0.5 block text-[0.85rem] leading-snug text-ink/60">{c.body}</span>
                </span>
                {(pickedStatus === c.status || current) && <CheckIcon className="size-5 shrink-0" />}
              </button>
            );
          })}
          <button
            disabled={!pickedStatus || busy}
            onClick={() => pickedStatus && changeStatus(pickedStatus, `${order.order_number} is now ${STATUS_LABEL[pickedStatus]}`)}
            className="btn btn-primary mx-1 mt-3 w-[calc(100%-0.5rem)]"
          >
            {busy ? "Saving…" : "Save status"}
          </button>
        </div>
      </AdminSheet>

      <AdminSheet open={sheet === "actions"} onClose={close} title="order options">
        <div className="p-2 pb-6">
          <ActionRow Icon={CheckIcon} label="Change status" onClick={() => setSheet("status")} />
          {canRefund && <ActionRow label="Refund" onClick={() => setSheet("refund")} />}
          {canCancel && <ActionRow label="Cancel order" danger onClick={() => setSheet("cancel")} />}
        </div>
      </AdminSheet>
    </>
  );
}

function Progress({ order, onChange }: { order: Order; onChange: () => void }) {
  const steps = [
    { label: "New", done: ["confirmed", "shipped", "delivered", "partially_refunded", "refunded"].includes(order.status) },
    { label: "Packed", done: ["shipped", "delivered"].includes(order.status) },
    { label: "Shipped", done: ["delivered"].includes(order.status) },
    { label: "Delivered", done: order.status === "delivered" },
  ];
  const offTrack = ["cancelled", "processing_failed", "partially_refunded", "refunded", "payment_pending", "payment_processing"].includes(order.status);
  const currentIndex = steps.findIndex((s) => !s.done);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={order.status} />
        <button onClick={onChange} className="min-h-10 text-[0.9rem] font-medium text-sage-deep">Change</button>
      </div>
      {needsDeposit(order) && (
        <p className="mt-2 text-[0.9rem] leading-snug text-gold-deep">Ask for at least {formatLKR(COD_MIN_DEPOSIT)} before packing this COD order.</p>
      )}
      {!offTrack && (
        <ol className="mt-3 grid grid-cols-4 gap-1.5">
          {steps.map((s, i) => (
            <li key={s.label}>
              <span className={`block h-1.5 rounded-full ${s.done ? "bg-sage-deep" : i === currentIndex ? "bg-gold" : "bg-ink/10"}`} />
              <span className={`mt-1.5 block text-[0.75rem] ${s.done || i === currentIndex ? "font-medium" : "text-ink/50"}`}>{s.label}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t border-line pt-1.5 font-semibold" : ""}`}>
      <dt className={strong ? "" : "text-ink/65"}>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ActionRow({ Icon, label, onClick, danger }: { Icon?: typeof PrintIcon; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`flex min-h-14 w-full items-center gap-3.5 rounded-xl px-3 text-left font-medium hover:bg-mist ${danger ? "text-[#a5432f]" : ""}`}>
      {Icon ? <Icon className="size-5" /> : <span className="size-5" />}
      {label}
    </button>
  );
}

function ConfirmBody({ body, confirm, onConfirm, busy, danger }: { body: string; confirm: string; onConfirm: () => void; busy: boolean; danger?: boolean }) {
  return (
    <div className="p-5">
      <p className="leading-relaxed text-ink/75">{body}</p>
      <button onClick={onConfirm} disabled={busy} className={`btn mt-5 w-full ${danger ? "bg-[#a5432f] text-ivory" : "btn-primary"}`}>
        {busy ? "Saving…" : confirm}
      </button>
    </div>
  );
}

function DepositForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const { source, run } = useAdmin();
  const total = num(order.total);
  const existing = num(order.advance_deposit);
  const [amount, setAmount] = useState(String(existing > 0 ? existing : order.payment_method === "cod" ? Math.min(COD_MIN_DEPOSIT, total) : total));
  const [reference, setReference] = useState(order.bank_slip_reference ?? "");
  const [note, setNote] = useState(order.advance_deposit_note ?? "");
  const [confirmOrder, setConfirmOrder] = useState(["pending", "awaiting_bank_slip"].includes(order.status));
  const [busy, setBusy] = useState(false);
  const value = num(amount);
  const tooMuch = value > total;
  const left = getCodBalanceDue({ total, refund_amount: order.refund_amount, advance_deposit: value });

  async function save() {
    setBusy(true);
    const ok = await run(
      () => source.recordDeposit({ orderId: order.id, depositAmount: value, slipReference: reference, depositNote: note, confirmOrder }),
      `Recorded ${formatLKR(value)} for ${order.order_number}`,
    );
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <div className="space-y-4 p-5">
      <Field label="Amount received" error={tooMuch ? `This can't be more than the order total of ${formatLKR(total)}.` : undefined}>
        <NumberInput value={amount} onChange={setAmount} prefix="Rs." />
      </Field>
      <div className="flex gap-2">
        {order.payment_method === "cod" && total > COD_MIN_DEPOSIT && (
          <button type="button" onClick={() => setAmount(String(COD_MIN_DEPOSIT))} className="min-h-11 flex-1 rounded-full border border-line px-3 text-[0.9rem] font-medium">{formatLKR(COD_MIN_DEPOSIT)}</button>
        )}
        <button type="button" onClick={() => setAmount(String(total))} className="min-h-11 flex-1 rounded-full border border-line px-3 text-[0.9rem] font-medium">Full {formatLKR(total)}</button>
      </div>
      <Field label="Slip reference (optional)">
        <input value={reference} onChange={(e) => setReference(e.target.value)} className="field" autoCapitalize="characters" />
      </Field>
      <Field label="Note (optional)">
        <input value={note} onChange={(e) => setNote(e.target.value)} className="field" />
      </Field>
      <div className="flex items-center justify-between rounded-xl bg-sage-soft/60 px-3.5 py-3">
        <span className="font-medium">Left to collect</span>
        <span className="font-semibold tabular-nums">{formatLKR(left)}</span>
      </div>
      <SwitchRow label="Also confirm the order" hint="Moves it to To pack." checked={confirmOrder} onChange={setConfirmOrder} />
      <button onClick={save} disabled={busy || tooMuch} className="btn btn-primary w-full">{busy ? "Saving…" : "Save payment"}</button>
    </div>
  );
}

function RefundForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const { source, run } = useAdmin();
  const remaining = num(order.total) - num(order.refund_amount);
  const [amount, setAmount] = useState(String(remaining));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const value = num(amount);
  const invalid = value <= 0 || value > remaining;
  const full = value === remaining;

  async function save() {
    setBusy(true);
    const ok = await run(() => source.refund({ orderId: order.id, refundAmount: value, reason }), `Refunded ${formatLKR(value)} on ${order.order_number}`);
    setBusy(false);
    if (ok) onDone();
  }

  return (
    <div className="space-y-4 p-5">
      <Field label="Refund amount" error={value > remaining ? `The most you can refund is ${formatLKR(remaining)}.` : undefined} hint={full ? "A full refund puts the pieces back in stock." : undefined}>
        <NumberInput value={amount} onChange={setAmount} prefix="Rs." />
      </Field>
      <Field label="Reason">
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="field" autoCapitalize="sentences" />
      </Field>
      <p className="text-[0.88rem] leading-snug text-ink/60">This records the refund here. Send the money back to the customer yourself.</p>
      <button onClick={save} disabled={busy || invalid} className="btn w-full bg-[#a5432f] text-ivory disabled:opacity-50">{busy ? "Saving…" : `Refund ${formatLKR(value)}`}</button>
    </div>
  );
}
