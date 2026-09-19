// Dev tool: run supabase/delete_user_bunyawat.sql against the Supabase pooler.
// Usage: node scripts/run-delete-user-bunyawat.mjs <displayName>
//
// DESTRUCTIVE - deletes ALL rows (if_sessions, weight_logs, measurements,
// progress photos meta, missions progress, profile) for ONE user matched by
// display_name, then removes the user row.
//
// Reads DATABASE_URL_PROVIDED from .env (never printed). Outputs a
// verification table (all rows should be 0 after a successful run).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
const sqlPath = path.join(root, "supabase", "delete_user_bunyawat.sql");

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
  const displayName = process.argv[2];
  if (!displayName) {
    console.error("Usage: node scripts/run-delete-user-bunyawat.mjs <displayName>");
    process.exit(1);
  }

  // ฝังชื่อ user ลงใน SQL ก่อนรัน (แทนที่ display_name 'bunyawat' ตรง ๆ)
  let sql = fs.readFileSync(sqlPath, "utf8");
  sql = sql.replace(/= 'bunyawat'/, `= '${displayName.replace(/'/g, "''")}'`);

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

  console.log(`Deleting ALL data for user "${displayName}" ...`);

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const results = await client.query(sql);
    for (const r of results) {
      if (Array.isArray(r.rows) && r.rows.length > 0) {
        for (const row of r.rows) {
          console.log(`${row.table_name}: ${row.rows_now} rows remaining`);
        }
      }
    }
    console.log("delete OK");
  } catch (err) {
    console.error("delete FAILED:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();