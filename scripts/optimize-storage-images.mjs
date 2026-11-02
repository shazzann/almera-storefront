#!/usr/bin/env node

/**
 * One-Shot Storage Image Optimizer Script
 *
 * Scans the Supabase Storage bucket (`product-images`), finds unoptimized or large images (> 250 KB),
 * downloads and compresses them with `sharp` to WebP (max 1200x1600 @ 82% quality), and re-uploads
 * under the exact same path with `upsert: true`.
 *
 * Usage:
 *   node scripts/optimize-storage-images.mjs          # Dry-run mode (safe preview)
 *   node scripts/optimize-storage-images.mjs --live   # Executes re-compression & upload
 */

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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
const FOLDER = "products";
const SIZE_THRESHOLD_BYTES = 250 * 1024; // Only optimize files larger than 250 KB

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://aalqjdmnkoxtwwuunhhe.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseKey) {
  console.error("❌ Error: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function run() {
  console.log("\n=======================================================");
  console.log(" 🖼️  Almera Storage Image Optimizer");
  console.log("=======================================================");
  console.log(` Mode:        ${isLive ? "🟢 LIVE (Overwriting storage with optimized WebP)" : "🟡 DRY RUN (Preview only)"}`);
  console.log(` Bucket:      ${BUCKET}/${FOLDER}`);
  console.log(` Threshold:   > ${formatBytes(SIZE_THRESHOLD_BYTES)}`);
  console.log("=======================================================\n");

  const { data: files, error } = await supabase.storage.from(BUCKET).list(FOLDER, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });

  if (error) {
    console.error("❌ Failed to list bucket files:", error.message);
    process.exit(1);
  }

  const largeFiles = files.filter((f) => f.metadata?.size > SIZE_THRESHOLD_BYTES);
  console.log(`Found ${files.length} files in '${FOLDER}/'. ${largeFiles.length} file(s) exceed ${formatBytes(SIZE_THRESHOLD_BYTES)}:\n`);

  if (largeFiles.length === 0) {
    console.log("✨ All images are already well-optimized!");
    return;
  }

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of largeFiles) {
    const filePath = `${FOLDER}/${file.name}`;
    const originalSize = file.metadata.size;
    totalOriginal += originalSize;

    console.log(`⏳ Processing: ${file.name} (${formatBytes(originalSize)})...`);

    // 1. Download original file
    const { data: blob, error: downloadError } = await supabase.storage.from(BUCKET).download(filePath);
    if (downloadError) {
      console.error(`   ❌ Download error: ${downloadError.message}`);
      continue;
    }

    const inputBuffer = Buffer.from(await blob.arrayBuffer());

    // 2. Compress and resize using sharp
    const optimizedBuffer = await sharp(inputBuffer)
      .rotate() // auto-orient based on EXIF
      .resize({
        width: 1200,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 5 })
      .toBuffer();

    const newSize = optimizedBuffer.length;
    totalOptimized += newSize;
    const savingsPercent = (((originalSize - newSize) / originalSize) * 100).toFixed(1);

    console.log(`   📉 ${formatBytes(originalSize)} ➔ ${formatBytes(newSize)} (saved ${savingsPercent}%)`);

    // 3. Upload back to Supabase
    if (isLive) {
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, optimizedBuffer, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });

      if (uploadError) {
        console.error(`   ❌ Upload error: ${uploadError.message}`);
      } else {
        console.log(`   ✅ Replaced in storage!`);
      }
    }
  }

  console.log("\n=======================================================");
  const totalSavings = totalOriginal - totalOptimized;
  const overallSavingsPercent = (((totalSavings) / totalOriginal) * 100).toFixed(1);
  console.log(` Total Original:  ${formatBytes(totalOriginal)}`);
  console.log(` Total Optimized: ${formatBytes(totalOptimized)}`);
  console.log(` Total Savings:   ${formatBytes(totalSavings)} (${overallSavingsPercent}% reduction)`);

  if (!isLive) {
    console.log("\n 💡 Dry run completed. No storage files were altered.");
    console.log(" Run with '--live' to re-upload optimized versions:");
    console.log("   node scripts/optimize-storage-images.mjs --live");
  } else {
    console.log("\n ✅ Storage optimization complete! All files compressed.");
  }
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

