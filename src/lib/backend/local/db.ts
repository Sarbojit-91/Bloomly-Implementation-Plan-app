import "server-only";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { LOCAL_AUTH_SCHEMA } from "./schema";
import { DEMO_ACCOUNT } from "./demo-account";
import { hashPassword } from "./passwords";

/**
 * The embedded Postgres used in local mode. Data lives in `.bloomly-data/`
 * in the project folder (override with BLOOMLY_LOCAL_DB_DIR), so it survives
 * restarts. On first use it creates the auth stand-in and applies every SQL
 * file in `supabase/migrations`, exactly as Supabase would.
 */

const globalForDb = globalThis as unknown as { __bloomlyDb?: Promise<PGlite> };

async function open(): Promise<PGlite> {
  const dir = process.env.BLOOMLY_LOCAL_DB_DIR ?? join(process.cwd(), ".bloomly-data");
  const db = await PGlite.create(dir);

  const bootstrapped = await db.query<{ ok: string | null }>(`select to_regclass('auth.local_migrations')::text as ok`);
  if (!bootstrapped.rows[0]?.ok) await db.exec(LOCAL_AUTH_SCHEMA);

  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const applied = new Set(
    (await db.query<{ name: string }>(`select name from auth.local_migrations`)).rows.map((r) => r.name),
  );
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await db.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(`insert into auth.local_migrations (name) values ($1)`, [file]);
    });
  }
  await ensureDemoAccount(db);
  return db;
}

/** Creates the confirmed demo account if it isn't there yet (see demo-account.ts). */
async function ensureDemoAccount(db: PGlite) {
  const exists = await db.query(`select 1 from auth.users where email = $1`, [DEMO_ACCOUNT.email]);
  if (exists.rows.length > 0) return;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  await db.query(
    `insert into auth.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
     values ($1, $2, $3, now())`,
    [
      DEMO_ACCOUNT.email,
      await hashPassword(DEMO_ACCOUNT.password),
      JSON.stringify({ display_name: DEMO_ACCOUNT.displayName, timezone }),
    ],
  );
}

/** One shared database per server process (kept across dev hot reloads). */
export function getDb(): Promise<PGlite> {
  if (!globalForDb.__bloomlyDb) {
    globalForDb.__bloomlyDb = open().catch((err) => {
      globalForDb.__bloomlyDb = undefined;
      throw err;
    });
  }
  return globalForDb.__bloomlyDb;
}

/**
 * Run queries as a signed-in user, the same way Supabase does: inside a
 * transaction, switched to the `authenticated` role with the user's id as the
 * JWT subject. Row-level security therefore applies to every query.
 */
export async function asUser<T>(userId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    await tx.exec(`set local role authenticated`);
    return fn(tx);
  });
}

/** Convert driver values to what the app expects (ISO strings for timestamps). */
export function normalize<T extends Record<string, unknown>>(row: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString() : v;
  return out as T;
}
