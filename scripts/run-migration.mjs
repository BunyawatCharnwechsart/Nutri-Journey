#!/usr/bin/env node
/**
 * Runs all SQL migrations in supabase/migrations/ in order.
 *
 * Usage:
 *   node scripts/run-migration.mjs                 # run all pending migrations
 *   node scripts/run-migration.mjs --file=0007...  # run a single migration file
 *
 * Connection string is read from process.env.DATABASE_URL_PROVIDED
 * (GitHub Actions sets it from a repo secret). When running locally it falls
 * back to the DATABASE_URL_PROVIDED line in .env.
 *
 * Every migration is idempotent (uses "if not exists" etc.) so running the
 * whole folder again is safe.
 */

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const SCRIPT_DIR = fileURLToPath(new URL(".", import.meta.url));
const MIGRATIONS_DIR = resolve(SCRIPT_DIR, "../supabase/migrations");

// Load DATABASE_URL_PROVIDED from .env only when not already set (e.g. local dev).
function getConnectionString() {
  let url = process.env.DATABASE_URL_PROVIDED;

  if (!url) {
    const envFile = resolve(SCRIPT_DIR, "../.env");
    if (existsSync(envFile)) {
      process.loadEnvFile(envFile);
    }
    url = process.env.DATABASE_URL_PROVIDED;
  }

  if (!url) {
    throw new Error(
      "DATABASE_URL_PROVIDED is not set. Add it to the environment or .env"
    );
  }

  return normalizeUrl(url);
}

/**
 * Fixes an accidentally duplicated scheme prefix that breaks pg's parser,
 * e.g. "postgresql:postgresql://..." -> "postgresql://...".
 * This protects against a bad value in .env or in CI secrets.
 */
function normalizeUrl(url) {
  return url.replace(/^postgres(?:ql)?:postgres(?:ql)?:\/\//, "postgresql://");
}

function migrationFiles() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith(".sql"))
    .sort();
}

async function run() {
  const singleFile = process.argv
    .find((arg) => arg.startsWith("--file="))
    ?.slice("--file=".length);

  const files = singleFile
    ? migrationFiles().filter((file) => file.includes(singleFile))
    : migrationFiles();

  if (files.length === 0) {
    console.error(
      singleFile
        ? `No migration file matches "${singleFile}"`
        : `No .sql files found in ${MIGRATIONS_DIR}`
    );
    process.exit(1);
  }

  const connectionString = getConnectionString();
  const masked = connectionString.replace(/:[^:@/]+@/, ":***@");
  console.log(`Connecting to ${masked}`);

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    for (const file of files) {
      const sql = readFileSync(resolve(MIGRATIONS_DIR, file), "utf8");
      console.log(`==> Applying ${basename(file)}`);
      await client.query(sql);
      console.log(`    OK`);
    }
    console.log("\nAll migrations applied successfully.");
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});