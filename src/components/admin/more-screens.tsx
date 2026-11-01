"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronIcon, CloseIcon, PlusIcon } from "@/components/icons";
import { useAdmin } from "./admin-app";
import { AddToHomeIcon, CameraIcon, ClockIcon, DownloadIcon, LayersIcon, SignOutIcon, StoreIcon } from "./admin-icons";
import { describeActivity, downloadOrdersCsv, num, slugify, timeAgo, type CategoryRow } from "./lib";
import { AdminSheet, Card, EmptyState, Field, StickyBar, SwitchRow, TopBar } from "./ui";

type InstallPrompt = Event & { prompt: () => Promise<void> };

const ROW_SHAKE: Keyframe[] = [
  { transform: "translateX(0) scale(1)" },
  { transform: "translateX(-6px) rotate(-0.6deg) scale(1.02)" },
  { transform: "translateX(5px) rotate(0.5deg) scale(1.02)" },
  { transform: "translateX(-4px) rotate(-0.3deg) scale(1.01)" },
  { transform: "translateX(2px) rotate(0.2deg) scale(1.01)" },
  { transform: "translateX(0) scale(1)" },
];

export function MoreScreen() {
  const { data, email, go, source, toast } = useAdmin();
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const rowClass = "flex min-h-16 w-full items-center gap-3.5 px-4 text-left";
  const iconClass = "grid size-10 shrink-0 place-items-center rounded-full bg-sage-soft text-sage-deep";

  return (
    <>
      <TopBar title="more" subtitle={email} />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4 pb-6">
        <Card className="divide-y divide-line">
          <button onClick={() => go({ view: "hero" })} className={rowClass}>
            <span className={iconClass}><StoreIcon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Homepage hero</span>
              <span className="block truncate text-[0.82rem] text-ink/60">Cover product and season line</span>
            </span>
            <ChevronIcon className="size-4 opacity-40" />
          </button>
          <button onClick={() => go({ view: "categories" })} className={rowClass}>
            <span className={iconClass}><LayersIcon className="size-5" /></span>
            <span className="flex-1 font-medium">Categories</span>
            <ChevronIcon className="size-4 opacity-40" />
          </button>
          <button onClick={() => go({ view: "activity" })} className={rowClass}>
            <span className={iconClass}><ClockIcon className="size-5" /></span>
            <span className="flex-1 font-medium">Recent activity</span>
            <ChevronIcon className="size-4 opacity-40" />
          </button>
          <button
            onClick={() => {
              downloadOrdersCsv(data.orders);
              toast("Orders downloaded");
            }}
            className={rowClass}
          >
            <span className={iconClass}><DownloadIcon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Download orders</span>
              <span className="block text-[0.82rem] text-ink/60">Spreadsheet of your latest {data.orders.length} orders</span>
            </span>
          </button>
        </Card>

        <Card className="divide-y divide-line">
          <button
            onClick={() => {
              if (install) install.prompt().then(() => setInstall(null));
              else setShowHowTo(true);
            }}
            className={rowClass}
          >
            <span className={iconClass}><AddToHomeIcon className="size-5" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">Add to home screen</span>
              <span className="block text-[0.82rem] text-ink/60">Open your shop like an app</span>
            </span>
          </button>
          <a href="/" target="_blank" rel="noreferrer" className={rowClass}>
            <span className={iconClass}><StoreIcon className="size-5" /></span>
            <span className="flex-1 font-medium">View store</span>
          </a>
          <button onClick={() => source.signOut().then(() => window.location.assign("/"))} className={rowClass}>
            <span className={iconClass}><SignOutIcon className="size-5" /></span>
            <span className="flex-1 font-medium">Sign out</span>
          </button>
        </Card>
      </div>

      <AdminSheet open={showHowTo} onClose={() => setShowHowTo(false)} title="add to home screen">
        <div className="space-y-3 p-5 leading-relaxed">
          <p><strong className="font-semibold">Android (Chrome):</strong> tap the ⋮ menu at the top, then Add to Home screen.</p>
          <p><strong className="font-semibold">iPhone (Safari):</strong> tap the Share button at the bottom, then Add to Home Screen.</p>
        </div>
      </AdminSheet>
    </>
  );
}

export function ActivityScreen() {
  const { data, back } = useAdmin();
  return (
    <>
      <TopBar title="Recent activity" onBack={() => back({ view: "more" })} />
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-6">
        {data.auditLogs.length === 0 ? (
          <EmptyState title="nothing yet" body="Changes you make to orders and products will be listed here." />
        ) : (
          <Card className="divide-y divide-line">
            {data.auditLogs.map((log) => {
              const a = describeActivity(log);
              return (
                <div key={log.id} className="px-4 py-3.5">
                  <p className="leading-snug font-medium break-words">{a.title}</p>
                  <p className="mt-0.5 text-[0.85rem] text-ink/60">
                    {a.detail ? `${a.detail} · ` : ""}{timeAgo(log.created_at)}
                  </p>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </>
  );
}

export function CategoriesScreen() {
  const { data, back, go } = useAdmin();
  const counts = (slug: string) => data.products.filter((p) => p.categories?.includes(slug)).length;
  return (
    <>
      <TopBar
        title="Categories"
        onBack={() => back({ view: "more" })}
        right={data.categories.length > 1 && <button onClick={() => go({ view: "category-order" })} className="px-3 py-2 text-[0.9rem] font-medium text-sage-deep">Reorder</button>}
      />
      <div className="mx-auto max-w-3xl px-4 pt-4 pb-6">
        <Card className="divide-y divide-line">
          {data.categories.map((c) => (
            <button key={c.slug} onClick={() => go({ view: "category", id: c.slug })} className="flex min-h-[4.5rem] w-full items-center gap-3.5 p-3 text-left">
              <span className="arch relative h-14 w-11 shrink-0 overflow-hidden bg-sage-soft">
                {c.image_url && <Image src={c.image_url} alt="" fill sizes="44px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-[0.85rem] text-ink/60">
                  {c.is_active === false ? "Hidden · " : ""}
                  {c.slug === "ready-to-wear" ? "Fills automatically" : `${counts(c.slug)} products`}
                </span>
              </span>
              <ChevronIcon className="size-4 opacity-40" />
            </button>
          ))}
        </Card>
      </div>
      <button
        onClick={() => go({ view: "category", id: "new" })}
        className="fixed right-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center gap-2 rounded-full bg-ink pr-5 pl-4 font-semibold text-ivory shadow-lg lg:bottom-6"
      >
        <PlusIcon className="size-5" /> New category
      </button>
    </>
  );
}

export function CategoryOrderScreen() {
  const { data, source, run, back } = useAdmin();
  const [order, setOrder] = useState(data.categories);
  const [moved, setMoved] = useState<{ slug: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const changed = order.some((c, i) => c.slug !== data.categories[i]?.slug);

  // Runs after the row has moved, so the shake plays in its new place, even on repeat taps.
  useEffect(() => {
    if (!moved || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    list.current?.querySelector(`[data-slug="${moved.slug}"]`)?.animate(ROW_SHAKE, { duration: 380, easing: "ease-out" });
  }, [moved]);

  function move(index: number, by: 1 | -1) {
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    setOrder(next);
    setMoved({ slug: item.slug });
  }

  async function save() {
    setSaving(true);
    const ok = await run(() => source.reorderCategories(order.map((c) => c.slug)), "Category order saved");
    setSaving(false);
    if (ok) back({ view: "categories" });
  }

  return (
    <>
      <TopBar title="Reorder categories" onBack={() => back({ view: "categories" })} />
      <div ref={list} className="mx-auto max-w-3xl px-4 pt-4">
        <p className="mb-3 px-1 text-[0.9rem] leading-relaxed text-ink/65">Customers see categories in this order on the homepage slider and in the menus.</p>
        <Card className="divide-y divide-line">
          {order.map((c, i) => (
            <div key={c.slug} data-slug={c.slug} className={`flex min-h-[4.5rem] items-center gap-3 p-3 transition-colors ${moved?.slug === c.slug ? "relative z-10 bg-sage-soft" : ""}`}>
              <span className="w-5 shrink-0 text-center text-[0.9rem] text-ink/60 tabular-nums">{i + 1}</span>
              <span className="arch relative h-14 w-11 shrink-0 overflow-hidden bg-sage-soft">
                {c.image_url && <Image src={c.image_url} alt="" fill sizes="44px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{c.name}</span>
                {c.is_active === false && <span className="block text-[0.85rem] text-ink/60">Hidden</span>}
              </span>
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.name} up`} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-ivory disabled:opacity-30">
                <ChevronIcon className="size-4 -rotate-90" />
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${c.name} down`} className="grid size-11 shrink-0 place-items-center rounded-full border border-line bg-ivory disabled:opacity-30">
                <ChevronIcon className="size-4 rotate-90" />
              </button>
            </div>
          ))}
        </Card>
      </div>

      <StickyBar>
        <button onClick={save} disabled={saving || !changed} className="btn btn-primary flex-1 text-[0.82rem] disabled:opacity-40">{saving ? "Saving…" : "Save order"}</button>
      </StickyBar>
    </>
  );
}

export function CategoryEditor({ id }: { id: string | null }) {
  const { data, source, run, back, toast } = useAdmin();
  const existing: CategoryRow | undefined = data.categories.find((c) => c.slug === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [group, setGroup] = useState<NonNullable<CategoryRow["nav_group"]>>(existing?.nav_group ?? "Everyday");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [image, setImage] = useState(existing?.image_url ?? "");
  const [subs, setSubs] = useState<string[]>(existing?.subcategories ?? []);
  const [newSub, setNewSub] = useState("");
  const [visible, setVisible] = useState(existing?.is_active !== false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [askHide, setAskHide] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      setImage(await source.uploadImage(file, "categories"));
    } catch (err) {
      toast(err instanceof Error ? `Photo didn't upload: ${err.message}` : "The photo didn't upload.", "err");
    }
    setUploading(false);
  }

  async function save() {
    if (name.trim().length < 2) {
      setError("Give this category a name.");
      return;
    }
    const slug = existing?.slug ?? slugify(name);
    if (!existing && data.categories.some((c) => c.slug === slug)) {
      setError("You already have a category with this name.");
      return;
    }
    setSaving(true);
    const ok = await run(
      () =>
        source.saveCategory({
          id: existing?.id,
          slug,
          name: name.trim(),
          nav_group: group,
          subcategories: subs,
          description: description.trim(),
          image_url: image,
          sort_order: num(existing?.sort_order ?? data.categories.length + 1),
          is_active: visible,
        }),
      `${name.trim()} saved`,
    );
    setSaving(false);
    if (ok) back({ view: "categories" });
  }

  return (
    <>
      <TopBar title={existing ? "Edit category" : "New category"} onBack={() => back({ view: "categories" })} />
      <div className="mx-auto max-w-3xl space-y-3 px-4 pt-4">
        <Card className="p-4">
          <h2 className="font-semibold">Photo</h2>
          <label className="mt-3 flex cursor-pointer items-center gap-4">
            <span className="arch relative grid h-32 w-24 shrink-0 place-items-center overflow-hidden bg-sage-soft">
              {image ? <Image src={image} alt="" fill sizes="96px" className="object-cover" /> : <CameraIcon className="size-7" />}
            </span>
            <span className="font-medium text-sage-deep underline underline-offset-4">{uploading ? "Uploading…" : image ? "Change photo" : "Add photo"}</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
        </Card>
        <Card className="space-y-4 p-4">
          <Field label="Name" error={error}>
            <input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} className="field" autoCapitalize="words" />
          </Field>
          <Field label="Short description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="field resize-none" autoCapitalize="sentences" />
          </Field>
          <div>
            <p className="mb-1.5 text-[0.9rem] font-medium">Group in the Shop menu</p>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-mist p-1" role="group" aria-label="Menu group">
              {(["Everyday", "Special", "More"] as const).map((g) => (
                <button key={g} type="button" aria-pressed={group === g} onClick={() => setGroup(g)} className={`min-h-11 rounded-lg text-[0.9rem] font-medium ${group === g ? "bg-ivory shadow-sm" : "text-ink/65"}`}>{g}</button>
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Types</h2>
          <p className="mt-0.5 text-[0.85rem] text-ink/60">Shown as filters on this category’s page, like Cotton or Rayon.</p>
          {subs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {subs.map((s) => (
                <span key={s} className="inline-flex min-h-10 items-center gap-1 rounded-full bg-sage-soft pl-3.5 text-[0.9rem] font-medium">
                  {s}
                  <button type="button" onClick={() => setSubs(subs.filter((x) => x !== s))} aria-label={`Remove ${s}`} className="grid size-10 place-items-center"><CloseIcon className="size-4" /></button>
                </span>
              ))}
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add a type" aria-label="Add a type" className="field" autoCapitalize="words" />
            <button
              type="button"
              aria-label="Add type"
              disabled={!newSub.trim()}
              onClick={() => {
                if (!subs.includes(newSub.trim())) setSubs([...subs, newSub.trim()]);
                setNewSub("");
              }}
              className="grid size-[3.25rem] shrink-0 place-items-center rounded-xl bg-ink text-ivory disabled:opacity-30"
            >
              <PlusIcon className="size-5" />
            </button>
          </div>
        </Card>
        <Card className="px-4 py-1">
          <SwitchRow
            label="Show in store"
            checked={visible}
            onChange={(v) => {
              if (!v) setAskHide(true);
              else setVisible(true);
            }}
          />
        </Card>
      </div>

      <StickyBar>
        <button onClick={save} disabled={saving || uploading} className="btn btn-primary flex-1 text-[0.82rem]">{saving ? "Saving…" : existing ? "Save changes" : "Create category"}</button>
      </StickyBar>

      <AdminSheet open={askHide} onClose={() => setAskHide(false)} title="hide this category?">
        <div className="p-5">
          <p className="leading-relaxed text-ink/75">It disappears from the store menu and homepage. Its products stay in any other categories they belong to.</p>
          <button onClick={() => { setVisible(false); setAskHide(false); }} className="btn btn-primary mt-5 w-full">Hide category</button>
        </div>
      </AdminSheet>
    </>
  );
}
