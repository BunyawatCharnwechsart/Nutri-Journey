#!/usr/bin/env node
/**
 * DEV ONLY — Seed realistic progress photo data for 9 months.
 *
 * Uses the local mockup image `public/icon/Mockup.JPG` for EVERY photo and
 * uploads it to the `progress-photos` Supabase Storage bucket, then inserts
 * rows into `progress_photos` so the /photo page is fully populated for UI
 * testing.
 *
 * Usage:
 *   node scripts/seed-progress-photos.mjs
 *
 * Reads .env for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * and DATABASE_URL_PROVIDED. Idempotent: deletes existing rows + storage
 * objects for the user first, then re-creates everything.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import pg from "pg";

process.loadEnvFile(".env");

const BUCKET = "progress-photos";

const THAI_MONTHS = [
  "มกราคม","กุมภาพันธ์","มีนาคม","เมษายน",
  "พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม",
  "กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม",
];

// 9 months, newest first: Sep 2026 → Jan 2026.
const MONTHS = Array.from({ length: 9 }, (_, i) => {
  const year  = 2026;
  const month = 9 - i; // Sep=9, Aug=8, ... Jan 2026 = month 1
  const adj   = month <= 0 ? month + 12 : month;
  const adjY  = month <= 0 ? year - 1   : year;
  return {
    monthKey: `${adjY}-${String(adj).padStart(2, "0")}`,
    recordedMonth: `${adjY}-${String(adj).padStart(2, "0")}-01`,
    label: `${THAI_MONTHS[adj - 1]} ${adjY}`,
  };
});

const VIEWS = [
  { view: "front", label: "ด้านหน้า" },
  { view: "side",  label: "ด้านข้าง" },
  { view: "back",  label: "ด้านหลัง" },
];

// One local mockup image reused for every month × view (no external calls).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MOCKUP_PATH = path.join(__dirname, "..", "public", "icon", "Mockup.JPG");

async function main() {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl  = process.env.DATABASE_URL_PROVIDED;

  if (!supabaseUrl || !serviceKey || !databaseUrl) {
    console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL_PROVIDED");
    process.exit(1);
  }

  // ---- DB client (pg) for table queries ----
  const pgClient = new pg.Client({ connectionString: databaseUrl });
  await pgClient.connect();

  // ---- Supabase client (service role) for storage uploads ----
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    // 1. Find a user to seed for.
    const userRes = await pgClient.query(
      "select user_id from public.users order by created_at asc limit 1"
    );
    const userId = userRes.rows[0]?.user_id;
    if (!userId) {
      console.error("No users in DB — log in first, then re-run.");
      process.exit(1);
    }
    console.log(`Seeding progress photos for user ${userId}`);

    // 2. Load the mockup image ONCE (used for every month × view).
    const mockupBuffer = await readFile(MOCKUP_PATH);

    // 3. Delete any existing data for this user (idempotent).
    const existing = await pgClient.query(
      "select photo_path from public.progress_photos where user_id = $1",
      [userId]
    );
    for (const row of existing.rows) {
      await supabase.storage.from(BUCKET).remove([row.photo_path]);
    }
    await pgClient.query(
      "delete from public.progress_photos where user_id = $1",
      [userId]
    );
    console.log(`Cleared ${existing.rowCount} existing photo(s).`);

    // 4. Upload + insert each month × view.
    let total = 0;
    for (let mi = 0; mi < MONTHS.length; mi++) {
      const month = MONTHS[mi];
      console.log(`\n  ${month.label}`);

      for (const { view } of VIEWS) {
        const objectPath = `${userId}/${month.recordedMonth}/${view}-seed.jpg`;

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(objectPath, mockupBuffer, { contentType: "image/jpeg", upsert: true });

        if (uploadErr) {
          console.error(`    ✗ ${view}: upload failed — ${uploadErr.message}`);
          continue;
        }

        await pgClient.query(
          `insert into public.progress_photos (user_id, recorded_month, view, photo_path)
           values ($1, $2, $3, $4)`,
          [userId, month.recordedMonth, view, objectPath]
        );
        console.log(`    ✓ ${view}: ${objectPath}`);
        total++;
      }
    }

    console.log(`\nDone — seeded ${total} photo(s) across ${MONTHS.length} months.`);
  } finally {
    await pgClient.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});