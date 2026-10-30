"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categories, categoryGroups, formatLKR, getCategory, products, startingPrice } from "@/lib/catalog";
import { cart, totals, useCart } from "@/lib/cart";
import { Wordmark } from "./brand";
import { ArrowIcon, BagIcon, ChevronIcon, InstagramIcon, MenuIcon, SearchIcon, WhatsAppIcon } from "./icons";
import { Sheet } from "./sheet";

const NOTICES = [
  "Island-wide delivery across Sri Lanka",
  "Free delivery on orders over Rs. 25,000",
  "Cash on delivery available",
];

const NAV = [
  { href: "/shop/lawns", label: "Lawns" },
  { href: "/shop/occasion", label: "Occasion" },
];
const navLink = "text-[0.72rem] font-semibold tracking-[0.16em] uppercase transition-colors hover:text-sage-deep";

function AnnouncementBar() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % NOTICES.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-9 overflow-hidden bg-olive text-ivory">
      {NOTICES.map((n, idx) => (
        <p
          key={n}
          aria-hidden={idx !== i}
          className={`absolute inset-0 grid place-items-center px-4 text-center text-[0.68rem] font-medium tracking-[0.16em] uppercase transition-all duration-700 ${idx === i ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          {n}
        </p>
      ))}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { lines } = useCart();
  const { count } = totals(lines);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!shopOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShopOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shopOpen]);

  if (pathname === "/checkout") return <CheckoutHeader />;

  return (
    <>
      <AnnouncementBar />
      <header
        className={`sticky top-0 z-40 transition-[background-color,box-shadow] duration-300 ${scrolled ? "bg-mist/90 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md" : "bg-mist"}`}
      >
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-3 sm:h-20 sm:px-6">
          <div className="flex h-full items-center">
            <button onClick={() => setMenuOpen(true)} className="grid size-11 place-items-center rounded-full hover:bg-ivory lg:hidden" aria-label="Open menu">
              <MenuIcon />
            </button>
            <nav className="hidden h-full items-center gap-7 lg:flex" aria-label="Main">
              <Link href="/shop" className={`${navLink} ${pathname === "/shop" ? "text-sage-deep" : ""}`}>New in</Link>
              <div
                className="flex h-full items-center"
                onPointerEnter={(e) => e.pointerType === "mouse" && setShopOpen(true)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setShopOpen(false)}
              >
                <button
                  // Hover already opened it for mouse users, so a click shouldn't close it again.
                  onClick={(e) => setShopOpen((o) => ((e.nativeEvent as PointerEvent).pointerType === "mouse" ? true : !o))}
                  aria-expanded={shopOpen} className={`${navLink} flex h-full items-center gap-1.5`}
                >
                  Shop
                  <ChevronIcon className={`size-3 transition-transform ${shopOpen ? "-rotate-90" : "rotate-90"}`} />
                </button>
                <div className={`absolute inset-x-0 top-full border-y border-line bg-ivory shadow-lg transition-[opacity,visibility] duration-200 ${shopOpen ? "visible opacity-100" : "invisible opacity-0"}`}>
                  <div className="mx-auto grid max-w-7xl grid-cols-3 gap-8 px-8 py-9">
                    {categoryGroups.map((g) => (
                      <div key={g.title}>
                        <p className="eyebrow mb-3 text-gold-deep">{g.title}</p>
                        <ul>
                          {g.slugs.map((slug) => (
                            <li key={slug}>
                              <Link href={`/shop/${slug}`} onNavigate={() => setShopOpen(false)} className="display block py-1.5 text-[1.7rem] hover:text-sage-deep">
                                {getCategory(slug)!.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className={`${navLink} ${pathname === n.href ? "text-sage-deep" : ""}`}>
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link href="/" aria-label="almera home" className="px-2">
            <Wordmark />
          </Link>

          <div className="flex items-center justify-end gap-0.5">
            <Link href="/about" className="mr-5 hidden text-[0.72rem] font-semibold tracking-[0.16em] uppercase hover:text-sage-deep lg:block">
              Our story
            </Link>
            <button onClick={() => setSearchOpen(true)} className="grid size-11 place-items-center rounded-full hover:bg-ivory" aria-label="Search">
              <SearchIcon />
            </button>
            <button onClick={cart.open} className="relative grid size-11 place-items-center rounded-full hover:bg-ivory" aria-label={`Bag, ${count} items`}>
              <BagIcon />
              {count > 0 && (
                <span className="absolute top-1.5 right-1 grid min-w-[1.15rem] place-items-center rounded-full bg-gold px-1 text-[0.62rem] leading-[1.15rem] font-semibold text-ivory">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <Sheet open={menuOpen} onClose={closeMenu} side="left" title="almera">
        <nav className="px-5 py-6" aria-label="Mobile">
          <button
            onClick={() => setCategoriesOpen((o) => !o)}
            aria-expanded={categoriesOpen}
            aria-controls="menu-categories"
            className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl pr-3 text-left"
          >
            <span className="display text-[1.9rem]">categories</span>
            <ChevronIcon className={`size-4 transition-transform duration-300 ${categoriesOpen ? "-rotate-90" : "rotate-90"}`} />
          </button>
          <div id="menu-categories" className={`grid transition-[grid-template-rows,visibility] duration-300 ${categoriesOpen ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]"}`}>
            <ul className="min-h-0 space-y-1 overflow-hidden">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/shop/${c.slug}`} onNavigate={closeMenu} className="group flex items-center gap-4 rounded-2xl p-1.5 pr-3 hover:bg-mist">
                    <span className="arch relative h-14 w-11 shrink-0 overflow-hidden bg-sage-soft">
                      <Image src={c.image} alt="" fill sizes="44px" className="object-cover" />
                    </span>
                    <span className="display flex-1 text-[1.45rem]">{c.name}</span>
                    <ArrowIcon className="size-4 opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <Link href="/shop" onNavigate={closeMenu} className="btn btn-primary mt-6 w-full">
            Shop all new arrivals
          </Link>
          <ul className="mt-8 space-y-1 border-t border-line pt-6 text-[0.95rem]">
            {[
              ["/about", "Our story"],
              ["/help", "Delivery, sizing & FAQ"],
              ["/contact", "Contact us"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} onNavigate={closeMenu} className="block py-2.5 hover:text-sage-deep">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex gap-3">
            <a href="https://www.instagram.com/almera.lk/" target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-line" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://chat.whatsapp.com/G5xidVIQxc3Cw0bEEpnach" target="_blank" rel="noreferrer" className="grid size-11 place-items-center rounded-full border border-line" aria-label="WhatsApp community">
              <WhatsAppIcon />
            </a>
          </div>
        </nav>
      </Sheet>

      <SearchSheet open={searchOpen} onClose={closeSearch} />
    </>
  );
}

function CheckoutHeader() {
  return (
    <header className="border-b border-line bg-mist">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6">
        <Link href="/" aria-label="almera home">
          <Wordmark tagline={false} />
        </Link>
        <span className="eyebrow text-ink/60">Secure checkout</span>
      </div>
    </header>
  );
}

const SUGGESTIONS = ["Lawn", "Lehenga", "Hakoba", "Muslin", "Cotton", "Denim"];

function SearchSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products.filter((p) => [p.name, p.colour, p.fabric, p.subcategory, ...p.categories, p.description].join(" ").toLowerCase().includes(term));
  }, [q]);

  return (
    <Sheet open={open} onClose={onClose} side="right" title="search">
      <div className="px-5 py-5">
        <label className="relative block">
          <span className="sr-only">Search the wardrobe</span>
          <SearchIcon className="absolute top-1/2 left-4 -translate-y-1/2 opacity-50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Colour, fabric or style"
            className="field pl-12"
            autoComplete="off"
            enterKeyHint="search"
          />
        </label>
        {!q && (
          <div className="mt-6">
            <p className="eyebrow mb-3 text-ink/60">Popular right now</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => setQ(s)} className="rounded-full border border-line px-4 py-2 text-sm hover:border-ink">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {q && (
          <p className="mt-5 text-sm text-ink/60">
            {results.length === 0 ? `Nothing matches “${q}”. Try a colour like “lilac” or a fabric like “lawn”.` : `${results.length} ${results.length === 1 ? "piece" : "pieces"}`}
          </p>
        )}
        <ul className="mt-3 divide-y divide-line">
          {results.map((p) => (
            <li key={p.slug}>
              <Link href={`/product/${p.slug}`} onNavigate={onClose} className="flex items-center gap-4 py-3">
                <span className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-sage-soft">
                  <Image src={p.images[0]} alt="" fill sizes="64px" className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-sm text-ink/60">From {formatLKR(startingPrice(p))}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
