import Link from "next/link";
import { categories as defaultCategories, type Category } from "@/lib/catalog";
import { WardrobeMark } from "./brand";
import { InstagramIcon, WhatsAppIcon } from "./icons";

export function Footer({
  categoryList = defaultCategories,
}: {
  categoryList?: Category[];
}) {
  return (
    <footer className="mt-auto bg-sage text-ink">
      <div className="mx-auto max-w-7xl px-5 pt-16 pb-10 sm:px-8">
        <div className="grid gap-12 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-end gap-4">
              <WardrobeMark className="h-16 w-auto text-ivory" />
              <div>
                <p className="display text-5xl text-olive">almera</p>
                <p className="mt-1.5 text-[0.6rem] font-semibold tracking-[0.42em] text-ivory uppercase">
                  the desi wardrobe
                </p>
              </div>
            </div>
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ink/75">
              Pakistani lawn, ready-to-wear and bridal, chosen piece by piece and delivered
              across Sri Lanka.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://www.instagram.com/almera.lk/"
                target="_blank"
                rel="noreferrer"
                className="grid size-11 place-items-center rounded-full bg-ivory/40 hover:bg-ivory"
                aria-label="almera on Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href="https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach"
                target="_blank"
                rel="noreferrer"
                className="grid size-11 place-items-center rounded-full bg-ivory/40 hover:bg-ivory"
                aria-label="Join the almera WhatsApp community"
              >
                <WhatsAppIcon />
              </a>
            </div>
          </div>

          <FooterCol title="Shop">
            <FooterLink href="/shop">New arrivals</FooterLink>
            {categoryList.map((c) => (
              <FooterLink key={c.slug} href={`/shop/${c.slug}`}>
                {c.name}
              </FooterLink>
            ))}
          </FooterCol>
          <FooterCol title="Help">
            <FooterLink href="/track-order">Track your order</FooterLink>
            <FooterLink href="/help#delivery">Delivery</FooterLink>
            <FooterLink href="/help#sizing">Size guide</FooterLink>
            <FooterLink href="/help#payment">Payment & COD policy</FooterLink>
            <FooterLink href="/help#policy">Order policy</FooterLink>
            <FooterLink href="/contact">Contact us</FooterLink>
          </FooterCol>
          <FooterCol title="almera">
            <FooterLink href="/about">Our story</FooterLink>
            <FooterLink href="https://www.instagram.com/almera.lk/">
              Instagram · @almera.lk
            </FooterLink>
            <FooterLink href="https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach">
              WhatsApp community
            </FooterLink>
          </FooterCol>
        </div>

        <div className="mt-14 rounded-2xl bg-ivory/45 px-5 py-4 text-sm leading-relaxed">
          <strong className="font-semibold">All sales are final.</strong> We don’t offer
          exchanges, returns or refunds, so please check the{" "}
          <Link href="/help#sizing" className="underline underline-offset-4">
            size guide
          </Link>{" "}
          before ordering.
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-ink/15 pt-6 text-xs text-ink/65 sm:flex-row sm:justify-between">
          <p>© 2026 almera. Colombo, Sri Lanka.</p>
          <p>Cash on delivery · Bank transfer · Island-wide courier</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-4 text-ink/60">{title}</p>
      <ul className="space-y-2.5 text-[0.95rem]">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <li>
      {external ? (
        <a href={href} target="_blank" rel="noreferrer" className="hover:text-ivory">
          {children}
        </a>
      ) : (
        <Link href={href} className="hover:text-ivory">
          {children}
        </Link>
      )}
    </li>
  );
}
