#!/usr/bin/env node

/**
 * Retroactive Database Migration Script: Migrate Image URLs to Cloudflare Edge CDN
 *
 * Usage:
 *   node scripts/migrate-to-cdn-urls.mjs          # Dry-run mode (safe preview)
 *   node scripts/migrate-to-cdn-urls.mjs --live   # Executes database updates
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// 1. Load local environment variables if available
function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const isLive = process.argv.includes("--live");
const BUCKET = "product-images";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://aalqjdmnkoxtwwuunhhe.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const cdnUrl = (
  process.env.NEXT_PUBLIC_CDN_URL ||
  process.env.STORAGE_CDN_URL ||
  "https://cdn.almera.lk"
).replace(/\/+$/, "");

if (!supabaseKey) {
  console.error("❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log("\n=======================================================");
console.log(" 🚀 Almera Media CDN Database Migration");
console.log("=======================================================");
console.log(` Mode:        ${isLive ? "🟢 LIVE (Executing DB updates)" : "🟡 DRY RUN (Preview only, no changes)"}`);
console.log(` Target CDN:  ${cdnUrl}`);
console.log(` Supabase:    ${supabaseUrl}`);
console.log("=======================================================\n");

function getStoragePath(source) {
  if (!source || typeof source !== "string") return null;
  const trimmed = source.trim();
  if (!trimmed || trimmed.startsWith("data:") || trimmed.startsWith("blob:")) return null;
  if (trimmed.includes("images.unsplash.com")) return null;
  if (trimmed.startsWith("/brand/") || trimmed === "/placeholder.svg" || trimmed === "/icon.svg") return null;

  // Already on target CDN
  if (trimmed.startsWith(`${cdnUrl}/storage/v1/object/public/${BUCKET}/`)) {
    return null;
  }

  const clean = trimmed.split(/[?#]/)[0];

  // Legacy proxy route
  const proxyMatch = clean.match(/(?:\/api\/public\/image\/)(.+)$/);
  if (proxyMatch) return sanitize(proxyMatch[1]);

  // Supabase public storage url
  const storageMatch = clean.match(new RegExp(`(?:/storage/v1/object/public/${BUCKET}/)(.+)$`));
  if (storageMatch) return sanitize(storageMatch[1]);

  const genericStorageMatch = clean.match(/(?:\/storage\/v1\/object\/public\/[^/]+\/)(.+)$/);
  if (genericStorageMatch) return sanitize(genericStorageMatch[1]);

  // Relative storage path
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    let stripped = clean.replace(/^\/+/, "");
    if (stripped.startsWith(`${BUCKET}/`)) {
      stripped = stripped.slice(BUCKET.length + 1);
    }
    return sanitize(stripped);
  }

  return null;
}

function sanitize(path) {
  return path.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.\./g, "");
}

function transformUrl(url) {
  const path = getStoragePath(url);
  if (!path) return null;
  return `${cdnUrl}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function migrateCategories() {
  console.log("🔍 Inspecting table: categories...");
  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, slug, name, image_url");

  if (error) {
    console.error("  ❌ Failed to fetch categories:", error.message);
    return;
  }

  const toUpdate = [];
  for (const cat of categories ?? []) {
    const nextUrl = transformUrl(cat.image_url);
    if (nextUrl && nextUrl !== cat.image_url) {
      toUpdate.push({ id: cat.id, slug: cat.slug, oldUrl: cat.image_url, newUrl: nextUrl });
    }
  }

  console.log(`  Found ${categories.length} categories, ${toUpdate.length} need migration.`);
  for (const item of toUpdate) {
    console.log(`  • [${item.slug}] \n      From: ${item.oldUrl}\n      To:   ${item.newUrl}`);
    if (isLive) {
      const { error: updateError } = await supabase
        .from("categories")
        .update({ image_url: item.newUrl })
        .eq("id", item.id);
      if (updateError) console.error(`    ❌ Update failed: ${updateError.message}`);
    }
  }
}

async function migrateProducts() {
  console.log("\n🔍 Inspecting table: products...");
  const { data: products, error } = await supabase
    .from("products")
    .select("id, slug, name, images");

  if (error) {
    console.error("  ❌ Failed to fetch products:", error.message);
    return;
  }

  const toUpdate = [];
  for (const prod of products ?? []) {
    let changed = false;
    const currentImages = Array.isArray(prod.images) ? prod.images : [];
    const newImages = currentImages.map((img) => {
      const next = transformUrl(img);
      if (next && next !== img) {
        changed = true;
        return next;
      }
      return img;
    });

    if (changed) {
      toUpdate.push({ id: prod.id, slug: prod.slug, oldImages: currentImages, newImages });
    }
  }

  console.log(`  Found ${products.length} products, ${toUpdate.length} need migration.`);
  for (const item of toUpdate) {
    console.log(`  • [${item.slug}] Migrating ${item.newImages.length} images:`);
    console.log(`      From: ${item.oldImages[0]}`);
    console.log(`      To:   ${item.newImages[0]}`);
    if (isLive) {
      const { error: updateError } = await supabase
        .from("products")
        .update({ images: item.newImages })
        .eq("id", item.id);
      if (updateError) console.error(`    ❌ Update failed: ${updateError.message}`);
    }
  }
}

async function migrateOrderItems() {
  console.log("\n🔍 Inspecting table: order_items...");
  const { data: items, error } = await supabase
    .from("order_items")
    .select("id, order_id, image_url");

  if (error) {
    console.error("  ❌ Failed to fetch order_items:", error.message);
    return;
  }

  const toUpdate = [];
  for (const item of items ?? []) {
    const nextUrl = transformUrl(item.image_url);
    if (nextUrl && nextUrl !== item.image_url) {
      toUpdate.push({ id: item.id, oldUrl: item.image_url, newUrl: nextUrl });
    }
  }

  console.log(`  Found ${items.length} order items, ${toUpdate.length} need migration.`);
  for (const item of toUpdate) {
    console.log(`  • [order_item: ${item.id}] \n      From: ${item.oldUrl}\n      To:   ${item.newUrl}`);
    if (isLive) {
      const { error: updateError } = await supabase
        .from("order_items")
        .update({ image_url: item.newUrl })
        .eq("id", item.id);
      if (updateError) console.error(`    ❌ Update failed: ${updateError.message}`);
    }
  }
}

async function migrateSiteSettings() {
  console.log("\n🔍 Inspecting table: site_settings (hero & gallery)...");
  const { data: settings, error } = await supabase
    .from("site_settings")
    .select("key, value");

  if (error) {
    console.error("  ❌ Failed to fetch site_settings:", error.message);
    return;
  }

  for (const row of settings ?? []) {
    if (row.key === "hero" && row.value?.imageUrl) {
      const nextUrl = transformUrl(row.value.imageUrl);
      if (nextUrl && nextUrl !== row.value.imageUrl) {
        console.log(`  • [hero] \n      From: ${row.value.imageUrl}\n      To:   ${nextUrl}`);
        if (isLive) {
          const updatedValue = { ...row.value, imageUrl: nextUrl };
          await supabase.from("site_settings").update({ value: updatedValue }).eq("key", "hero");
        }
      }
    }

    if (row.key === "gallery" && Array.isArray(row.value?.tiles)) {
      let changed = false;
      const newTiles = row.value.tiles.map((tile) => {
        if (!tile) return tile;
        const next = transformUrl(tile);
        if (next && next !== tile) {
          changed = true;
          return next;
        }
        return tile;
      });

      if (changed) {
        console.log(`  • [gallery] Migrating tiles...`);
        if (isLive) {
          const updatedValue = { ...row.value, tiles: newTiles };
          await supabase.from("site_settings").update({ value: updatedValue }).eq("key", "gallery");
        }
      }
    }
  }
}

async function run() {
  try {
    await migrateCategories();
    await migrateProducts();
    await migrateOrderItems();
    await migrateSiteSettings();

    console.log("\n=======================================================");
    if (!isLive) {
      console.log(" 💡 Dry run completed. No data was modified.");
      console.log(" Run with '--live' to execute changes in the database:");
      console.log("   node scripts/migrate-to-cdn-urls.mjs --live");
    } else {
      console.log(" ✅ Live database migration complete!");
    }
    console.log("=======================================================\n");
  } catch (err) {
    console.error("Fatal error during migration:", err);
    process.exit(1);
  }
}

run();
