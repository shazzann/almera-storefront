#!/usr/bin/env node

/**
 * Creates the 320px and 640px copies (name-w320.webp, name-w640.webp) for every WebP photo in
 * storage that doesn't have them yet. New uploads get them automatically; this covers older photos.
 *
 * Usage:
 *   node scripts/create-image-sizes.mjs          # Dry run: counts photos missing copies
 *   node scripts/create-image-sizes.mjs --live   # Creates and uploads the missing copies
 *
 * Safe to run again: photos that already have both copies are skipped.
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { existsSync, readFileSync } from "node:fs";
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
// Keep in sync with IMAGE_VARIANT_WIDTHS in src/lib/image-url.ts.
const WIDTHS = [320, 640];
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey?.startsWith("sb_secret_")) {
  console.error("Needs NEXT_PUBLIC_SUPABASE_URL and a secret SUPABASE_SERVICE_ROLE_KEY in .env.local.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const variantPath = (path, width) => path.replace(/\.webp$/, `-w${width}.webp`);

/** Lists every file in the bucket, walking into folders and paging through long ones. */
async function listAll(prefix = "") {
  const files = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Listing ${prefix || "bucket"}: ${error.message}`);
    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) files.push(...(await listAll(path)));
      else files.push(path);
    }
    if (data.length < 100) return files;
  }
}

async function run() {
  const files = await listAll();
  const existing = new Set(files);
  const originals = files.filter((f) => f.endsWith(".webp") && !/-w\d+\.webp$/.test(f));
  const missing = originals.filter((f) => WIDTHS.some((w) => !existing.has(variantPath(f, w))));

  console.log(`\nMode: ${isLive ? "LIVE" : "dry run"}`);
  console.log(`WebP photos in storage: ${originals.length}. Missing smaller copies: ${missing.length}`);
  if (!isLive) {
    console.log("Dry run only. Add --live to create them.\n");
    return;
  }

  let done = 0;
  let bytes = 0;
  for (let i = 0; i < missing.length; i += 4) {
    await Promise.all(
      missing.slice(i, i + 4).map(async (path) => {
        const { data, error } = await supabase.storage.from(BUCKET).download(path);
        if (error) throw new Error(`Download ${path}: ${error.message}`);
        const original = Buffer.from(await data.arrayBuffer());
        for (const width of WIDTHS) {
          if (existing.has(variantPath(path, width))) continue;
          const small = await sharp(original).resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
          bytes += small.length;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(variantPath(path, width), small, { contentType: "image/webp", cacheControl: "31536000", upsert: true });
          if (upErr) throw new Error(`Upload ${variantPath(path, width)}: ${upErr.message}`);
        }
        done++;
      }),
    );
    process.stdout.write(`\r${done}/${missing.length} photos done`);
  }
  console.log(`\nDone. Uploaded ${(bytes / 1048576).toFixed(1)} MB of smaller copies.\n`);
}

run().catch((err) => {
  console.error(`\nStopped: ${err.message}`);
  console.error("Nothing already finished is lost. Fix the problem and run it again.");
  process.exit(1);
});
