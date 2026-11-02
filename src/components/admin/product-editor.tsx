"use client";

import Image from "@/components/image";
import { useEffect, useState } from "react";
import { CheckIcon, ChevronIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { DENIM_SIZES, SIZES, formatLKR, nameWithColour } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { CameraIcon, TrashIcon } from "./admin-icons";
import { AdminSheet, EmptyState, Field, NumberInput, StickyBar, StockRow, SwitchRow, TopBar, Card } from "./ui";
import { colourGroupOf, num, productPayload, renameForColour, stockRows, uniqueSlug, type ProductRow, type Tag } from "./lib";

const FABRICS = ["Lawn", "Cotton", "Rayon", "Muslin", "Khushboo", "Hakoba", "Chiffon", "Silk", "Denim"];
const PIECES = ["Kurta", "Shirt fabric", "Trouser", "Dupatta", "Choli", "Lehenga skirt", "Jacket", "Jeans"];
const TAGS: { key: Tag; label: string }[] = [
  { key: "new", label: "New arrival" },
  { key: "bestseller", label: "Most loved" },
  { key: "festive", label: "Festive" },
];

const NEW_DRAFT_KEY = "almera.admin.newProduct";
const NEW_COLOUR_PREFIX = "new-colour:";

type Form = {
  name: string;
  description: string;
  colour: string;
  fabric: string;
  images: string[];
  soldUnstitched: boolean;
  soldStitched: boolean;
  priceUnstitched: string;
  priceStitched: string;
  wasUnstitched: string;
  wasStitched: string;
  unstitchedStock: number;
  sizes: string[];
  sizeStocks: Record<string, number>;
  categories: string[];
  subcategory: string;
  pieces: string[];
  tags: Tag[];
  care: string;
  isActive: boolean;
  isFeatured: boolean;
};

const BLANK: Form = {
  name: "",
  description: "",
  colour: "",
  fabric: "",
  images: [],
  soldUnstitched: false,
  soldStitched: true,
  priceUnstitched: "",
  priceStitched: "",
  wasUnstitched: "",
  wasStitched: "",
  unstitchedStock: 0,
  sizes: [...SIZES],
  sizeStocks: {},
  categories: [],
  subcategory: "",
  pieces: [],
  tags: ["new"],
  care: "",
  isActive: true,
  isFeatured: false,
};

const text = (v: unknown) => (v == null ? "" : String(num(v)));

function formFrom(p: ProductRow): Form {
  const rows = stockRows(p);
  return {
    name: p.name,
    description: p.description ?? "",
    colour: p.colour ?? "",
    fabric: p.fabric ?? "",
    images: p.images ?? [],
    soldUnstitched: p.price_unstitched != null,
    soldStitched: p.price_stitched != null,
    priceUnstitched: text(p.price_unstitched),
    priceStitched: text(p.price_stitched),
    wasUnstitched: text(p.was_price_unstitched),
    wasStitched: text(p.was_price_stitched),
    unstitchedStock: rows.unstitched ?? 0,
    sizes: p.sizes?.length ? p.sizes : [...SIZES],
    sizeStocks: Object.fromEntries(rows.stitched.map((s) => [s.size, s.qty])),
    categories: p.categories ?? [],
    subcategory: p.subcategory ?? "",
    pieces: p.pieces ?? [],
    tags: p.tags ?? [],
    care: p.care ?? "",
    isActive: p.is_active !== false,
    isFeatured: Boolean(p.is_featured),
  };
}

/** Everything carries over except what's different for each colour. */
function colourFormFrom(source: ProductRow): Form {
  return {
    ...formFrom(source),
    name: renameForColour(source.name, source.colour, ""),
    colour: "",
    images: [],
    unstitchedStock: 0,
    sizeStocks: {},
    isActive: true,
    isFeatured: false,
  };
}

function readDraft(key: string): Form | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...BLANK, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
}

export function ProductEditor({ id }: { id: string | null }) {
  const { data, back } = useAdmin();
  const colourOf = id?.startsWith(NEW_COLOUR_PREFIX) ? id.slice(NEW_COLOUR_PREFIX.length) : null;
  const source = colourOf ? data.products.find((p) => p.slug === colourOf) : undefined;
  const isNew = id === "new" || Boolean(source);
  const found = data.products.find((p) => p.id === id || p.slug === id);
  // Keeps the form on screen while a deleted product's sheet closes and the list opens.
  const [lastFound, setLastFound] = useState(found);
  const [deleting, setDeleting] = useState(false);
  if (found && found !== lastFound) setLastFound(found);
  const existing = found ?? (deleting ? lastFound : undefined);

  if (!isNew && !existing) {
    return (
      <>
        <TopBar title="Product" onBack={() => back({ view: "products" })} />
        <div className="mx-auto max-w-3xl p-4">
          <EmptyState title="product not found" body="It may have been removed. Go back to see your products." />
        </div>
      </>
    );
  }
  return <EditorForm key={id ?? "new"} existing={existing} colourSource={source} onDeleting={setDeleting} />;
}

const FINISHED_ORDERS = ["delivered", "cancelled", "refunded"];

function EditorForm({ existing, colourSource, onDeleting }: { existing?: ProductRow; colourSource?: ProductRow; onDeleting: (deleting: boolean) => void }) {
  const { data, source, run, go, back, toast } = useAdmin();
  const isNew = !existing;
  const draftKey = colourSource ? `${NEW_DRAFT_KEY}.${colourSource.slug}` : NEW_DRAFT_KEY;
  const [initial] = useState<Form>(() => (existing ? formFrom(existing) : colourSource ? colourFormFrom(colourSource) : BLANK));
  const [form, setForm] = useState<Form>(initial);
  const [restored, setRestored] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(0);
  const [saving, setSaving] = useState(false);
  const [customPiece, setCustomPiece] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));
  };

  // A new product survives a phone call or the browser being closed halfway through.
  useEffect(() => {
    if (!isNew) return;
    const t = setTimeout(() => {
      const draft = readDraft(draftKey);
      if (draft) {
        setForm(draft);
        setRestored(true);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [isNew, draftKey]);

  useEffect(() => {
    if (!isNew || form === initial) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify(form));
    } catch {}
  }, [form, initial, isNew, draftKey]);

  function discardDraft() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setForm(initial);
    setRestored(false);
  }

  const selectable = data.categories.filter((c) => c.slug !== "ready-to-wear");
  const subcategoryOptions = Array.from(
    new Set(selectable.filter((c) => form.categories.includes(c.slug)).flatMap((c) => c.subcategories ?? [])),
  );
  const colourSiblings = existing ? colourGroupOf(existing, data.products) : [];

  function changeColour(colour: string) {
    // Follows the colour until the owner types their own name.
    const followsColour = colourSource && form.name === renameForColour(colourSource.name, colourSource.colour, form.colour);
    setForm((f) => ({ ...f, colour, name: followsColour ? renameForColour(colourSource.name, colourSource.colour, colour) : f.name }));
    setErrors((e) => (e.colour ? { ...e, colour: "" } : e));
  }

  function addColour() {
    if (!existing) return;
    if (JSON.stringify(form) !== JSON.stringify(initial)) {
      toast("Save your changes first, then add another colour.", "err");
      return;
    }
    go({ view: "product", id: `${NEW_COLOUR_PREFIX}${existing.slug}` });
  }

  const totalStock =
    (form.soldUnstitched ? form.unstitchedStock : 0) +
    (form.soldStitched ? form.sizes.reduce((sum, s) => sum + (form.sizeStocks[s] ?? 0), 0) : 0);

  async function addPhotos(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    setUploading(list.length);
    for (const file of list) {
      try {
        const url = await source.uploadImage(file, "products");
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      } catch (err) {
        toast(err instanceof Error ? `Photo didn't upload: ${err.message}` : "A photo didn't upload. Try it again.", "err");
      }
      setUploading((n) => Math.max(0, n - 1));
    }
    setErrors((e) => ({ ...e, images: "" }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (form.images.length === 0) e.images = "Add at least one photo.";
    if (form.name.trim().length < 2) e.name = "Give this product a name.";
    const groupMembers = colourSource ? colourGroupOf(colourSource, data.products) : colourSiblings.filter((p) => p.slug !== existing?.slug);
    if (colourSource || existing?.colour_group) {
      if (!form.colour.trim()) e.colour = "Enter the colour.";
      else if (groupMembers.some((p) => p.colour.trim().toLowerCase() === form.colour.trim().toLowerCase())) e.colour = "This item already has this colour.";
    }
    if (!form.soldUnstitched && !form.soldStitched) e.sold = "Choose at least one way to sell it.";
    if (form.soldUnstitched && num(form.priceUnstitched) <= 0) e.priceUnstitched = "Enter the unstitched price.";
    if (form.soldStitched && num(form.priceStitched) <= 0) e.priceStitched = "Enter the stitched price.";
    if (form.categories.length === 0) e.categories = "Choose where it appears in the store.";
    setErrors(e);
    const first = Object.keys(e)[0];
    if (first) document.getElementById(`section-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    return !first;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);
    const slugName = colourSource ? nameWithColour({ name: form.name, colour: form.colour, colourGroup: colourSource.slug }) : form.name;
    const slug = existing?.slug ?? uniqueSlug(slugName, data.products.map((p) => p.slug));
    const blankRow: ProductRow = { slug, name: "", categories: [], colour: "", fabric: "", images: [], pieces: [], sizes: [], tags: [], description: "", stock: 0 };
    const opt = (sold: boolean, v: string) => (sold && v ? num(v) : null);
    const ok = await run(
      () =>
        source.saveProduct(
          productPayload(existing ?? blankRow, {
            name: form.name.trim(),
            description: form.description.trim(),
            colour: form.colour.trim(),
            fabric: form.fabric.trim(),
            images: form.images,
            categories: form.categories,
            subcategory: form.subcategory || null,
            price_unstitched: opt(form.soldUnstitched, form.priceUnstitched),
            price_stitched: opt(form.soldStitched, form.priceStitched),
            was_price_unstitched: opt(form.soldUnstitched, form.wasUnstitched),
            was_price_stitched: opt(form.soldStitched, form.wasStitched),
            pieces: form.pieces,
            sizes: form.sizes,
            tags: form.tags,
            care: form.care.trim() || null,
            stock: totalStock,
            unstitched_stock: form.soldUnstitched ? form.unstitchedStock : null,
            size_stocks: form.soldStitched ? Object.fromEntries(form.sizes.map((s) => [s, form.sizeStocks[s] ?? 0])) : {},
            is_active: form.isActive,
            is_featured: form.isFeatured,
            ...(colourSource ? { colour_of: colourSource.slug } : {}),
          }),
        ),
      colourSource ? `${form.colour.trim()} added to your store` : isNew ? `${form.name.trim()} added to your store` : `${form.name.trim()} saved`,
    );
    setSaving(false);
    if (ok) {
      if (isNew) {
        try {
          localStorage.removeItem(draftKey);
        } catch {}
      }
      back({ view: "products" });
    }
  }

  async function remove() {
    setDeleteBusy(true);
    onDeleting(true);
    const ok = await run(() => source.deleteProduct(existing!.id!), `${existing!.name} deleted`);
    setDeleteBusy(false);
    if (ok) {
      setAskDelete(false);
      setTimeout(() => back({ view: "products" }), 300);
    } else {
      onDeleting(false);
    }
  }

  const openOrders = data.orders.filter((o) => !FINISHED_ORDERS.includes(o.status) && o.order_items?.some((it) => it.product_slug === existing?.slug)).length;

  return (
    <>
      <TopBar
        title={colourSource ? "New colour" : isNew ? "New product" : "Edit product"}
        subtitle={colourSource?.name ?? existing?.name}
        onBack={() => back({ view: "products" })}
        right={existing && <a href={`/product/${existing.slug}`} target="_blank" rel="noreferrer" className="px-3 py-2 text-[0.9rem] font-medium text-sage-deep">View</a>}
      />

      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        {restored && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-gold/15 px-4 py-2.5 text-[0.9rem]">
            <span>Your unsaved product is back.</span>
            <button onClick={discardDraft} className="min-h-9 font-semibold underline underline-offset-4">Start over</button>
          </div>
        )}

        {colourSource && (
          <p className="rounded-xl bg-sage-soft px-4 py-3 text-[0.9rem] leading-relaxed">Details and prices are copied from {colourSource.name}. Add this colour’s name, photos and stock.</p>
        )}

        <Card className="p-4" >
          <div id="section-images">
            <h2 className="font-semibold">Photos</h2>
            <p className="mt-0.5 text-[0.85rem] text-ink/60">The first photo is the one customers see first. Tap another photo to make it first.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {form.images.map((src, i) => (
                <div key={src} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-sage-soft">
                  <button
                    type="button"
                    onClick={() => set("images", [src, ...form.images.filter((x) => x !== src)])}
                    disabled={i === 0}
                    aria-label={i === 0 ? "First photo" : `Make photo ${i + 1} the first photo`}
                    className="absolute inset-0"
                  >
                    <Image src={src} alt="" fill sizes="(min-width: 768px) 200px, 33vw" className="object-cover" />
                  </button>
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[0.7rem] font-semibold text-ivory">First</span>}
                  <button type="button" onClick={() => set("images", form.images.filter((x) => x !== src))} aria-label={`Remove photo ${i + 1}`} className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-ink/70 text-ivory">
                    <CloseIcon className="size-4" />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploading }, (_, i) => (
                <div key={i} className="grid aspect-[3/4] animate-pulse place-items-center rounded-xl bg-sage-soft text-[0.82rem] font-medium text-sage-deep">Uploading…</div>
              ))}
              <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-ink/25 text-center text-[0.85rem] font-medium">
                <CameraIcon className="size-7" />
                Add photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {errors.images && <p role="alert" className="mt-2 text-[0.85rem] text-[#a5432f]">{errors.images}</p>}
          </div>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold">Details</h2>
          <div id="section-name">
            <Field label="Name" error={errors.name}>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Lilac chikan lawn" className="field" autoCapitalize="sentences" enterKeyHint="next" />
            </Field>
          </div>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Fabric feel, embroidery, when to wear it" className="field resize-none" autoCapitalize="sentences" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <div id="section-colour">
              <Field label="Colour" error={errors.colour}>
                <input value={form.colour} onChange={(e) => changeColour(e.target.value)} placeholder="Lilac" className="field" autoCapitalize="sentences" />
              </Field>
            </div>
            <Field label="Fabric">
              <input value={form.fabric} onChange={(e) => set("fabric", e.target.value)} placeholder="Lawn" className="field" autoCapitalize="sentences" />
            </Field>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
            {FABRICS.map((f) => (
              <button key={f} type="button" onClick={() => set("fabric", f)} className={`min-h-9 shrink-0 rounded-full border px-3 text-[0.85rem] ${form.fabric === f ? "border-ink bg-ink text-ivory" : "border-line"}`}>
                {f}
              </button>
            ))}
          </div>
        </Card>

        {existing && (
          <Card className="p-4">
            <h2 className="font-semibold">Colours</h2>
            <p className="mt-0.5 text-[0.85rem] leading-snug text-ink/60">Each colour has its own photos, price and stock. Customers choose between them on the product page.</p>
            {colourSiblings.length > 1 && (
              <ul className="mt-3 divide-y divide-line">
                {colourSiblings.map((p) => {
                  const current = p.slug === existing.slug;
                  return (
                    <li key={p.slug}>
                      <button type="button" disabled={current} onClick={() => go({ view: "product", id: p.id ?? p.slug })} className="flex min-h-16 w-full items-center gap-3 py-2 text-left">
                        <span className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-sage-soft">
                          {p.images[0] && <Image src={p.images[0]} alt="" fill sizes="36px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.colour || p.name}</span>
                          <span className="block text-[0.85rem] text-ink/60 tabular-nums">{p.is_active === false ? "Hidden · " : ""}{num(p.stock)} in stock</span>
                        </span>
                        {current ? <CheckIcon className="size-5 shrink-0" aria-label="This colour" /> : <ChevronIcon className="size-4 shrink-0 opacity-40" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button type="button" onClick={addColour} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line font-medium">
              <PlusIcon className="size-5" /> Add another colour
            </button>
          </Card>
        )}

        <Card className="p-4">
          <div id="section-sold">
            <h2 className="font-semibold">How it’s sold</h2>
            {errors.sold && <p role="alert" className="mt-1 text-[0.85rem] text-[#a5432f]">{errors.sold}</p>}
          </div>

          <div className="mt-1 divide-y divide-line">
            <div id="section-priceUnstitched" className="pb-3">
              <SwitchRow label="Unstitched" hint="3-piece fabric for their own tailor" checked={form.soldUnstitched} onChange={(v) => set("soldUnstitched", v)} />
              {form.soldUnstitched && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price" error={errors.priceUnstitched}>
                      <NumberInput value={form.priceUnstitched} onChange={(v) => set("priceUnstitched", v)} prefix="Rs." />
                    </Field>
                    <Field label="Old price (optional)" hint="Shown crossed out">
                      <NumberInput value={form.wasUnstitched} onChange={(v) => set("wasUnstitched", v)} prefix="Rs." />
                    </Field>
                  </div>
                  <StockRow label="In stock" value={form.unstitchedStock} onChange={(v) => set("unstitchedStock", v)} />
                </div>
              )}
            </div>

            <div id="section-priceStitched" className="pt-1">
              <SwitchRow label="Stitched" hint="Ready to wear, in sizes" checked={form.soldStitched} onChange={(v) => set("soldStitched", v)} />
              {form.soldStitched && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price" error={errors.priceStitched}>
                      <NumberInput value={form.priceStitched} onChange={(v) => set("priceStitched", v)} prefix="Rs." />
                    </Field>
                    <Field label="Old price (optional)" hint="Shown crossed out">
                      <NumberInput value={form.wasStitched} onChange={(v) => set("wasStitched", v)} prefix="Rs." />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-mist p-1" role="group" aria-label="Size type">
                    {[{ label: "M to XXL", sizes: [...SIZES] as string[] }, { label: "Denim 26 to 34", sizes: [...DENIM_SIZES] as string[] }].map((o) => {
                      const on = form.sizes[0] === o.sizes[0];
                      return (
                        <button key={o.label} type="button" onClick={() => set("sizes", o.sizes)} aria-pressed={on} className={`min-h-11 rounded-lg text-[0.9rem] font-medium ${on ? "bg-ivory shadow-sm" : "text-ink/65"}`}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="divide-y divide-line">
                    {form.sizes.map((s) => (
                      <StockRow key={s} label={`Size ${s}`} value={form.sizeStocks[s] ?? 0} onChange={(v) => set("sizeStocks", { ...form.sizeStocks, [s]: v })} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div id="section-categories">
            <h2 className="font-semibold">Where it appears</h2>
            <p className="mt-0.5 text-[0.85rem] leading-snug text-ink/60">The first one you pick is its main category. Stitched-only pieces also appear in Ready to Wear on their own.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectable.map((c) => {
                const index = form.categories.indexOf(c.slug);
                const on = index >= 0;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      set("categories", on ? form.categories.filter((x) => x !== c.slug) : [...form.categories, c.slug]);
                      if (on) set("subcategory", "");
                    }}
                    className={`min-h-11 rounded-full border px-4 text-[0.9rem] font-medium ${on ? "border-ink bg-ink text-ivory" : "border-line"}`}
                  >
                    {c.name}
                    {index === 0 && <span className="ml-1.5 text-[0.75rem] text-ivory/70">main</span>}
                  </button>
                );
              })}
            </div>
            {errors.categories && <p role="alert" className="mt-2 text-[0.85rem] text-[#a5432f]">{errors.categories}</p>}
          </div>

          {subcategoryOptions.length > 0 && (
            <div className="mt-4">
              <p className="text-[0.9rem] font-medium">Type (optional)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {subcategoryOptions.map((s) => {
                  const on = form.subcategory === s;
                  return (
                    <button key={s} type="button" aria-pressed={on} onClick={() => set("subcategory", on ? "" : s)} className={`min-h-11 rounded-full border px-4 text-[0.9rem] ${on ? "border-gold bg-gold/15 font-semibold" : "border-line"}`}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-4">
            <p className="text-[0.9rem] font-medium">Labels</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const on = form.tags.includes(t.key);
                return (
                  <button key={t.key} type="button" aria-pressed={on} onClick={() => set("tags", on ? form.tags.filter((x) => x !== t.key) : [...form.tags, t.key])} className={`min-h-11 rounded-full border px-4 text-[0.9rem] ${on ? "border-gold bg-gold/15 font-semibold" : "border-line"}`}>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold">What’s included</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from(new Set([...PIECES, ...form.pieces])).map((piece) => {
              const on = form.pieces.includes(piece);
              return (
                <button key={piece} type="button" aria-pressed={on} onClick={() => set("pieces", on ? form.pieces.filter((x) => x !== piece) : [...form.pieces, piece])} className={`min-h-11 rounded-full border px-4 text-[0.9rem] ${on ? "border-ink bg-ink text-ivory" : "border-line"}`}>
                  {piece}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={customPiece}
              onChange={(e) => setCustomPiece(e.target.value)}
              placeholder="Add something else"
              aria-label="Add something else"
              className="field"
              autoCapitalize="sentences"
              enterKeyHint="done"
            />
            <button
              type="button"
              aria-label="Add piece"
              disabled={!customPiece.trim()}
              onClick={() => {
                set("pieces", [...form.pieces, customPiece.trim()]);
                setCustomPiece("");
              }}
              className="grid size-[3.25rem] shrink-0 place-items-center rounded-xl bg-ink text-ivory disabled:opacity-30"
            >
              <PlusIcon className="size-5" />
            </button>
          </div>
          <div className="mt-4">
            <Field label="Care instructions (optional)">
              <input value={form.care} onChange={(e) => set("care", e.target.value)} placeholder="Dry clean for the first wash" className="field" autoCapitalize="sentences" />
            </Field>
          </div>
        </Card>

        <Card className="divide-y divide-line px-4 py-1">
          <SwitchRow label="Show in store" hint="Turn off to hide it without deleting it." checked={form.isActive} onChange={(v) => set("isActive", v)} />
          <SwitchRow label="Show first in the store" hint="Puts it at the top of product lists." checked={form.isFeatured} onChange={(v) => set("isFeatured", v)} />
        </Card>

        {existing && (
          <button type="button" onClick={() => setAskDelete(true)} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] border border-line bg-ivory font-medium text-[#a5432f]">
            <TrashIcon className="size-5" /> Delete product
          </button>
        )}
      </div>

      <StickyBar>
        <div className="flex min-w-0 flex-col justify-center pr-1">
          <span className="text-[0.78rem] text-ink/60">Total stock</span>
          <span className="font-semibold tabular-nums">{totalStock}</span>
        </div>
        <button onClick={save} disabled={saving || uploading > 0} className="btn btn-primary flex-1 text-[0.82rem]">
          {uploading > 0 ? "Uploading photos…" : saving ? "Saving…" : isNew ? `Add to store${form.soldStitched && num(form.priceStitched) ? ` · ${formatLKR(num(form.priceStitched))}` : ""}` : "Save changes"}
        </button>
      </StickyBar>

      <AdminSheet open={askDelete} onClose={() => setAskDelete(false)} title="delete this product?">
        <div className="p-5">
          <p className="leading-relaxed text-ink/75">
            <strong className="font-semibold text-ink">{existing?.name}</strong> will be removed from your store for good, and this can’t be undone. Past orders keep their details.
            {colourSiblings.length > 1 ? " Its other colours stay in the store." : ""}
          </p>
          {openOrders > 0 && (
            <p className="mt-3 rounded-xl bg-gold/15 px-3.5 py-2.5 text-[0.92rem] leading-snug">
              {openOrders === 1 ? "1 open order includes" : `${openOrders} open orders include`} this product. You can still pack and send {openOrders === 1 ? "it" : "them"}.
            </p>
          )}
          <p className="mt-3 text-[0.9rem] leading-snug text-ink/60">Might sell it again? Turn off Show in store to hide it instead.</p>
          <button onClick={remove} disabled={deleteBusy} className="btn mt-5 w-full bg-[#a5432f] text-ivory">{deleteBusy ? "Deleting…" : "Yes, delete product"}</button>
          <button onClick={() => setAskDelete(false)} disabled={deleteBusy} className="btn btn-ghost mt-2.5 w-full">Keep product</button>
        </div>
      </AdminSheet>
    </>
  );
}
