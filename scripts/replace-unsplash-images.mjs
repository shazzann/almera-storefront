#!/usr/bin/env node

/**
 * Replaces every Unsplash photo with a downloaded copy in our own storage, served through cdn.almera.lk.
 *
 * Covers product photos, category photos, the homepage hero setting, and the fixed site photos
 * that the code refers to by Unsplash id (stored as site/<id>.webp).
 *
 * Each product gets its own copy of a photo, even when two products share one, because deleting
 * a product also deletes its photo files.
 *
 * Usage:
 *   node scripts/replace-unsplash-images.mjs          # Dry run: lists what would change
 *   node scripts/replace-unsplash-images.mjs --live   # Downloads, uploads and updates the database
 *
 * Safe to run again: uploads overwrite the same file names, and photos already moved are skipped.
 * A live run first saves the current photo links to scripts/backups/.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnv();

const isLive = process.argv.includes("--live");
const BUCKET = "product-images";
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cdnHost = (process.env.NEXT_PUBLIC_CDN_URL || process.env.STORAGE_CDN_URL || "https://cdn.almera.lk").replace(/\/+$/, "");

if (!supabaseUrl || !serviceKey?.startsWith("sb_secret_")) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and a secret SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const isUnsplash = (url) => typeof url === "string" && url.includes("images.unsplash.com");
const photoId = (url) => url.split("?")[0].split("/photo-")[1];
const cdnUrl = (path) => `${cdnHost}/storage/v1/object/public/${BUCKET}/${path}`;

/** The same photo ids the code uses, kept in sync with src/lib/catalog.ts. */
const SITE_PHOTOS = [
  "1763400234383-8b9ecbb9c043", "1724856605022-106d6dd6e842", "1720982892402-5380e855320c",
  "1717585679395-bbe39b5fb6bc", "1717586756136-d9a3eeb1fa6f", "1720982018719-f2666caf447a",
  "1619715613791-89d35b51ff81", "1786596552158-fb0aa2d260ba", "1786596552096-c782a23e00b3",
  "1746372283841-dbb3838f9935", "1745313452052-0e4e341f326c", "1652953186915-420ae843d1a8",
  "1705920824583-0e783235394d", "1764928947261-f5687e0faa4a", "1597983073750-16f5ded1321f",
  "1747847471517-952a3eb93a89", "1733209484732-6b094322a89f", "1760624294535-40dfdc84a48f",
];

const downloads = new Map();
async function download(id) {
  if (!downloads.has(id)) {
    downloads.set(id, (async () => {
      const res = await fetch(`https://images.unsplash.com/photo-${id}?w=1600&q=85&fm=jpg&fit=max`);
      if (!res.ok) throw new Error(`Download failed for ${id}: HTTP ${res.status}`);
      // Same settings as scripts/optimize-storage-images.mjs and the admin upload.
      return sharp(Buffer.from(await res.arrayBuffer()))
        .rotate()
        .resize({ width: 1200, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    })());
  }
  return downloads.get(id);
}

let uploadedBytes = 0;
async function upload(path, id) {
  const body = await download(id);
  uploadedBytes += body.length;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Upload failed for ${path}: ${error.message}`);
  return cdnUrl(path);
}

/** Runs jobs a few at a time, so Unsplash and storage aren't flooded. */
async function inBatches(jobs, size = 4) {
  const results = [];
  for (let i = 0; i < jobs.length; i += size) results.push(...(await Promise.all(jobs.slice(i, i + size).map((job) => job()))));
  return results;
}

async function run() {
  const [{ data: products, error: pErr }, { data: categories, error: cErr }, { data: settings, error: sErr }] = await Promise.all([
    supabase.from("products").select("id, slug, images"),
    supabase.from("categories").select("slug, image_url"),
    supabase.from("site_settings").select("key, value"),
  ]);
  if (pErr || cErr || sErr) throw new Error(pErr?.message || cErr?.message || sErr?.message);

  const productJobs = products.flatMap((p) =>
    (p.images ?? []).map((url, index) => ({ p, url, index })).filter(({ url }) => isUnsplash(url)),
  );
  const categoryJobs = categories.filter((c) => isUnsplash(c.image_url));
  const hero = settings.find((s) => s.key === "hero");
  const heroNeedsMove = isUnsplash(hero?.value?.imageUrl);

  console.log(`\nMode: ${isLive ? "LIVE" : "dry run"}   CDN: ${cdnHost}`);
  console.log(`Product photos to move: ${productJobs.length} across ${new Set(productJobs.map((j) => j.p.slug)).size} products`);
  console.log(`Category photos to move: ${categoryJobs.length}`);
  console.log(`Homepage hero setting: ${heroNeedsMove ? "uses an Unsplash photo" : "already fine"}`);
  console.log(`Fixed site photos: ${SITE_PHOTOS.length} (stored as site/<id>.webp)`);
  if (!isLive) {
    console.log("\nDry run only. Add --live to make these changes.\n");
    return;
  }

  mkdirSync(resolve(process.cwd(), "scripts/backups"), { recursive: true });
  const backupPath = resolve(process.cwd(), `scripts/backups/photo-links-${new Date().toISOString().slice(0, 10)}.json`);
  if (!existsSync(backupPath)) {
    writeFileSync(backupPath, JSON.stringify({ products, categories, hero: hero?.value ?? null }, null, 2));
  }
  console.log(`Backup of current links: ${backupPath}\n`);

  // 1. Fixed site photos used by the code
  await inBatches(SITE_PHOTOS.map((id) => () => upload(`site/${id}.webp`, id)));
  console.log(`Uploaded ${SITE_PHOTOS.length} site photos`);

  // 2. Product photos, a separate copy for every product
  const moved = await inBatches(productJobs.map(({ p, url, index }) => async () => ({
    p, url, index, next: await upload(`products/${p.slug}-${index + 1}-${photoId(url)}.webp`, photoId(url)),
  })));
  const newImagesBySlug = new Map();
  for (const { p, index, next } of moved) {
    const images = newImagesBySlug.get(p.slug) ?? [...p.images];
    images[index] = next;
    newImagesBySlug.set(p.slug, images);
  }
  for (const [slug, images] of newImagesBySlug) {
    const { error } = await supabase.from("products").update({ images, updated_at: new Date().toISOString() }).eq("slug", slug);
    if (error) throw new Error(`Product ${slug}: ${error.message}`);
  }
  console.log(`Updated ${newImagesBySlug.size} products (${moved.length} photos)`);

  // 3. Category photos
  for (const c of categoryJobs) {
    const next = await upload(`categories/${c.slug}-${photoId(c.image_url)}.webp`, photoId(c.image_url));
    const { error } = await supabase.from("categories").update({ image_url: next }).eq("slug", c.slug);
    if (error) throw new Error(`Category ${c.slug}: ${error.message}`);
  }
  console.log(`Updated ${categoryJobs.length} categories`);

  // 4. The hero must point at one of its product's own photos, or the store ignores it
  if (heroNeedsMove) {
    const cover = moved.find(({ p, url }) => p.slug === hero.value.productSlug && photoId(url) === photoId(hero.value.imageUrl));
    const imageUrl = cover ? cover.next : null;
    const { error } = await supabase.from("site_settings").update({ value: { ...hero.value, imageUrl } }).eq("key", "hero");
    if (error) throw new Error(`Hero: ${error.message}`);
    console.log(`Updated the homepage hero${cover ? "" : " (cleared, so it uses the product's first photo)"}`);
  }

  console.log(`\nDone. Uploaded ${(uploadedBytes / 1048576).toFixed(1)} MB in total.\n`);
}

run().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  console.error("Nothing already finished is lost. Fix the problem and run it again.");
  process.exit(1);
});
