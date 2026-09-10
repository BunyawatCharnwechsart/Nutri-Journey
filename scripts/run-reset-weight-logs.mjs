// Dev tool: run supabase/reset_weight_logs.sql against the Supabase pooler.
// Usage: node scripts/run-reset-weight-logs.mjs
//
// DESTRUCTIVE - deletes ALL rows in weight_logs (every user). Run only on a
// dev database.
//
// Reads DATABASE_URL_PROVIDED from .env (never printed). Nothing is logged to
// stdout except the row counts.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const resetPath = path.join(root, "supabase", "reset_weight_logs.sql");

function loadEnv(filePath) {
  const env = {};
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = /^([A-Za-z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !m[1].startsWith("#")) {
      env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
    }
  }
  return env;
}

async function main() {
  const env = loadEnv(envPath);
  const url = env.DATABASE_URL_PROVIDED;
  if (!url) {
    console.error("DATABASE_URL_PROVIDED is missing in .env");
    process.exit(1);
  }
  if (!url.startsWith("postgres")) {
    console.error("DATABASE_URL_PROVIDED does not look like a postgres URL");
    process.exit(1);
  }

  const sql = fs.readFileSync(resetPath, "utf8");
  console.log(`running ${resetPath} ...`);

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("connected (connection string not printed)");
    const results = await client.query(sql);
    for (const r of results) {
      if (Array.isArray(r.rows) && r.rows.length > 0) {
        for (const row of r.rows) {
          console.log(`${row.table_name}: ${row.rows_now} rows`);
        }
      }
    }
    console.log("reset OK");
  } catch (err) {
    console.error("reset FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();