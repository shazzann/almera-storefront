import type { Metadata } from "next";
import Link from "next/link";
import { SizeGuideTable } from "@/components/size-guide";
import { DELIVERY, FREE_DELIVERY_FROM, STITCHING_FEE, formatLKR } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Delivery, sizing & FAQ",
  description: "Delivery times and fees across Sri Lanka, the almera size guide, payment options and our order policy.",
  alternates: { canonical: "/help" },
};

const FAQ = [
  { q: "What’s the difference between stitched and unstitched?", a: `Unstitched is the three-piece fabric (shirt, dupatta and trouser) for your own tailor. Stitched means our tailors make it up in a standard size for ${formatLKR(STITCHING_FEE)}, ready in 5–7 days.` },
  { q: "Can I give my own measurements?", a: "Yes. Choose the closest size, then add your measurements in the note at checkout. We’ll confirm them with you before stitching." },
  { q: "Are the colours accurate?", a: "We photograph in daylight and avoid filters, but screens differ. If colour matters, message us for an unedited photo or video before ordering." },
  { q: "How do I know my order went through?", a: "You’ll see a confirmation with your order number, and we’ll call or WhatsApp you within one working day." },
  { q: "Do you restock sold-out pieces?", a: "Lawn sometimes comes back. Bridal pieces are usually one of a kind. Follow @almera.lk to hear about restocks first." },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-8 pb-20 sm:px-8 sm:pt-14">
      <p className="eyebrow text-gold-deep">Help</p>
      <h1 className="display mt-4 text-[3.2rem] sm:text-7xl">
        before you <em className="text-sage-deep">order</em>
      </h1>
      <nav className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4" aria-label="On this page">
        {[["delivery", "Delivery"], ["sizing", "Sizing"], ["payment", "Payment"], ["policy", "Order policy"], ["faq", "FAQ"]].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="shrink-0 rounded-full border border-line bg-ivory px-5 py-2.5 text-sm font-medium hover:border-ink">{label}</a>
        ))}
      </nav>

      <Block id="delivery" title="Delivery">
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.values(DELIVERY).map((d) => (
            <div key={d.label} className="rounded-2xl bg-ivory p-5">
              <p className="font-semibold">{d.label}</p>
              <p className="mt-1 text-sm text-ink/65">{d.eta}</p>
              <p className="mt-3 text-lg font-semibold">{formatLKR(d.fee)}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 leading-relaxed text-ink/75">
          Standard delivery is free on orders over {formatLKR(FREE_DELIVERY_FROM)}. Stitched orders take 5–7 days before dispatch. We deliver to all 25 districts.
        </p>
      </Block>

      <Block id="sizing" title="Sizing">
        <SizeGuideTable />
        <h3 className="mt-8 mb-3 font-semibold">Denim</h3>
        <SizeGuideTable kind="denim" />
      </Block>

      <Block id="payment" title="Payment">
        <ul className="space-y-3 leading-relaxed text-ink/75">
          <li><strong className="font-semibold text-ink">Cash on delivery.</strong> Pay the courier when your parcel arrives.</li>
          <li><strong className="font-semibold text-ink">Bank transfer.</strong> We’ll send our account details on WhatsApp, and your order ships once the slip is confirmed.</li>
        </ul>
      </Block>

      <Block id="policy" title="Order policy">
        <div className="rounded-2xl bg-sage-soft p-6 leading-relaxed">
          <p className="font-semibold">All sales are final.</p>
          <p className="mt-2 text-ink/80">
            We don’t offer exchanges, returns or refunds. Please check the size guide and product details carefully, and message us with any questions before you order.
          </p>
        </div>
      </Block>

      <Block id="faq" title="Questions">
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map((f) => (
            <details key={f.q} className="group">
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
                {f.q}
                <span className="text-xl leading-none text-gold transition-transform group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="pb-5 leading-relaxed text-ink/70">{f.a}</p>
            </details>
          ))}
        </div>
        <p className="mt-8 text-ink/70">
          Still unsure? <Link href="/contact" className="underline underline-offset-4">Get in touch</Link>.
        </p>
      </Block>
    </div>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-14">
      <h2 className="display mb-5 text-4xl">{title}</h2>
      {children}
    </section>
  );
}
