"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { CloseIcon } from "@/components/icons";
import { galleryTiles } from "@/lib/catalog";
import { useAdmin } from "./admin-app";
import { CameraIcon } from "./admin-icons";
import { Card, StickyBar, TopBar } from "./ui";

export function GalleryEditor() {
  const { data, source, run, back, toast } = useAdmin();
  const [tiles, setTiles] = useState(data.gallery.tiles);
  const [uploading, setUploading] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const changed = JSON.stringify(tiles) !== JSON.stringify(data.gallery.tiles);

  // The same order the store uses, so the preview matches the homepage.
  const productPhotos = useMemo(
    () =>
      data.products
        .filter((p) => p.is_active !== false)
        .sort((a, b) => Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured)))
        .map((p) => p.images[0]),
    [data.products],
  );
  const shown = galleryTiles(productPhotos, { tiles });

  function setTile(index: number, value: string | null) {
    setTiles((cur) => cur.map((t, i) => (i === index ? value : t)));
  }

  async function upload(index: number, file?: File) {
    if (!file) return;
    setUploading((cur) => [...cur, index]);
    try {
      setTile(index, await source.uploadImage(file, "gallery"));
    } catch (err) {
      toast(err instanceof Error ? `Photo didn't upload: ${err.message}` : "The photo didn't upload. Try it again.", "err");
    }
    setUploading((cur) => cur.filter((i) => i !== index));
  }

  async function save() {
    setSaving(true);
    const ok = await run(() => source.saveGallery({ tiles }), "Homepage gallery updated");
    setSaving(false);
    if (ok) back({ view: "more" });
  }

  return (
    <>
      <TopBar
        title="Homepage gallery"
        onBack={() => back({ view: "more" })}
        right={<a href="/#insta" target="_blank" rel="noreferrer" className="px-3 py-2 text-[0.9rem] font-medium text-sage-deep">View</a>}
      />
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <Card className="p-4">
          <h2 className="font-semibold">Instagram photos</h2>
          <p className="mt-0.5 text-[0.85rem] leading-snug text-ink/60">These 6 photos sit at the bottom of the homepage and open your Instagram. Tap a photo to change it.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {shown.map((src, i) => {
              const own = Boolean(tiles[i]);
              const busy = uploading.includes(i);
              return (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-sage-soft">
                  <label className="absolute inset-0 cursor-pointer">
                    <span className="sr-only">Change photo {i + 1}</span>
                    <Image src={src} alt="" fill sizes="(min-width: 768px) 220px, 33vw" className={`object-cover ${busy ? "opacity-40" : ""}`} />
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        upload(i, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {busy ? (
                    <span className="pointer-events-none absolute inset-0 grid animate-pulse place-items-center text-[0.82rem] font-medium">Uploading…</span>
                  ) : own ? (
                    <button type="button" onClick={() => setTile(i, null)} aria-label={`Remove photo ${i + 1}`} className="absolute top-1 right-1 grid size-9 place-items-center rounded-full bg-ink/70 text-ivory">
                      <CloseIcon className="size-4" />
                    </button>
                  ) : (
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.7rem] font-medium text-ivory">
                      <CameraIcon className="size-3.5" /> Add
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[0.85rem] leading-snug text-ink/60">Photos marked Add are chosen automatically until you replace them.</p>
        </Card>
      </div>

      <StickyBar>
        <button onClick={save} disabled={saving || uploading.length > 0 || !changed} className="btn btn-primary flex-1 text-[0.82rem] disabled:opacity-40">
          {uploading.length > 0 ? "Uploading photo…" : saving ? "Saving…" : "Save gallery"}
        </button>
      </StickyBar>
    </>
  );
}
