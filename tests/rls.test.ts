/**
 * Runs the real migration against an in-process Postgres (PGlite) with the
 * same stand-in for Supabase's auth schema that local test mode uses, then checks that row-level security
 * keeps every user's data private.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { LOCAL_AUTH_SCHEMA } from "@/lib/backend/local/schema";

const A = "00000000-0000-0000-0000-00000000000a";
const B = "00000000-0000-0000-0000-00000000000b";

let db: PGlite;

async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false);`);
  await db.exec(userId ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rows = async (sql: string, params: unknown[] = []) => (await db.query<any>(sql, params)).rows;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(LOCAL_AUTH_SCHEMA);
  await db.exec(readFileSync(join(__dirname, "../supabase/migrations/20261029000000_init.sql"), "utf8"));
  await db.exec(`
    insert into auth.users (id, email, raw_user_meta_data) values
      ('${A}', 'a@example.test', '{"display_name":"Ada","timezone":"Asia/Kolkata"}'),
      ('${B}', 'b@example.test', '{}');
  `);
});

afterAll(async () => {
  await db?.close();
});

describe("profile trigger", () => {
  it("creates a profile with sign-up metadata", async () => {
    const [a] = await rows(`select display_name, timezone from public.profiles where id = $1`, [A]);
    expect(a).toEqual({ display_name: "Ada", timezone: "Asia/Kolkata" });
    const [b] = await rows(`select timezone from public.profiles where id = $1`, [B]);
    expect(b).toEqual({ timezone: "UTC" });
  });
});

describe("row-level security", () => {
  let habitA: string;

  beforeAll(async () => {
    habitA = await as(A, async () => {
      const [h] = await rows(`insert into public.habits (name, created_on) values ('Read', '2026-10-01') returning id`);
      await rows(`insert into public.habit_completions (habit_id, completed_on) values ($1, '2026-10-28')`, [h.id]);
      await rows(`insert into public.journal_entries (entry_date, mood, reflection) values ('2026-10-28', 4, 'Good day')`);
      return h.id as string;
    });
  });

  it("lets owners see their own data", async () => {
    await as(A, async () => {
      expect(await rows(`select name from public.habits`)).toEqual([{ name: "Read" }]);
      expect(await rows(`select count(*)::int as n from public.habit_completions`)).toEqual([{ n: 1 }]);
      expect(await rows(`select reflection from public.journal_entries`)).toEqual([{ reflection: "Good day" }]);
    });
  });

  it("hides one user's habits, completions, journal and profile from another", async () => {
    await as(B, async () => {
      expect(await rows(`select * from public.habits`)).toEqual([]);
      expect(await rows(`select * from public.habit_completions`)).toEqual([]);
      expect(await rows(`select * from public.journal_entries`)).toEqual([]);
      expect(await rows(`select id from public.profiles`)).toEqual([{ id: B }]);
    });
  });

  it("stops another user updating or deleting someone else's rows", async () => {
    await as(B, async () => {
      await rows(`update public.habits set name = 'Hacked' where id = $1`, [habitA]);
      await rows(`delete from public.habit_completions where habit_id = $1`, [habitA]);
      await rows(`update public.journal_entries set reflection = 'Hacked'`);
      await rows(`update public.profiles set display_name = 'Hacked' where id = $1`, [A]);
    });
    await as(A, async () => {
      expect(await rows(`select name from public.habits`)).toEqual([{ name: "Read" }]);
      expect(await rows(`select count(*)::int as n from public.habit_completions`)).toEqual([{ n: 1 }]);
      expect(await rows(`select reflection from public.journal_entries`)).toEqual([{ reflection: "Good day" }]);
      expect(await rows(`select display_name from public.profiles`)).toEqual([{ display_name: "Ada" }]);
    });
  });

  it("rejects completions or achievements on another user's habit", async () => {
    await expect(
      as(B, () => rows(`insert into public.habit_completions (habit_id, completed_on) values ($1, '2026-10-29')`, [habitA])),
    ).rejects.toThrow();
    await expect(
      as(B, () => rows(`insert into public.user_achievements (key, habit_id) values ('streak_7', $1)`, [habitA])),
    ).rejects.toThrow();
  });

  it("rejects rows written on behalf of someone else", async () => {
    await expect(as(B, () => rows(`insert into public.habits (user_id, name) values ($1, 'Sneaky')`, [A]))).rejects.toThrow();
    await expect(
      as(B, () => rows(`insert into public.journal_entries (user_id, entry_date) values ($1, '2026-10-29')`, [A])),
    ).rejects.toThrow();
  });

  it("gives anonymous visitors no access", async () => {
    await expect(as(null, () => rows(`select * from public.habits`))).rejects.toThrow(/permission denied/);
    await expect(as(null, () => rows(`select * from public.journal_entries`))).rejects.toThrow(/permission denied/);
  });
});

describe("data integrity", () => {
  it("prevents duplicate completions for the same habit and date", async () => {
    await as(A, async () => {
      const [h] = await rows(`insert into public.habits (name) values ('Water') returning id`);
      await rows(`insert into public.habit_completions (habit_id, completed_on) values ($1, '2026-10-29')`, [h.id]);
      await expect(
        rows(`insert into public.habit_completions (habit_id, completed_on) values ($1, '2026-10-29')`, [h.id]),
      ).rejects.toThrow(/duplicate key/);
      // The upsert the app uses is idempotent.
      await rows(
        `insert into public.habit_completions (habit_id, completed_on, value) values ($1, '2026-10-29', 2)
         on conflict (habit_id, completed_on) do update set value = excluded.value`,
        [h.id],
      );
      expect(await rows(`select value::float from public.habit_completions where habit_id = $1`, [h.id])).toEqual([
        { value: 2 },
      ]);
    });
  });

  it("stores each achievement only once, including user-level ones", async () => {
    await as(A, async () => {
      await rows(`insert into public.user_achievements (key) values ('first_bloom') on conflict do nothing`);
      await rows(`insert into public.user_achievements (key) values ('first_bloom') on conflict do nothing`);
      expect(await rows(`select count(*)::int as n from public.user_achievements where key = 'first_bloom'`)).toEqual([
        { n: 1 },
      ]);
    });
  });

  it("validates schedules and weekly goals", async () => {
    await as(A, async () => {
      await expect(rows(`insert into public.habits (name, schedule_days, weekly_goal) values ('X', '{1,3}', 3)`)).rejects.toThrow();
      await expect(rows(`insert into public.habits (name, schedule_days) values ('X', '{7}')`)).rejects.toThrow();
      await expect(rows(`insert into public.habits (name) values ('   ')`)).rejects.toThrow();
    });
  });

  it("removes all of a user's data when the account is deleted", async () => {
    await db.exec(`delete from auth.users where id = '${A}'`);
    for (const table of ["profiles", "habits", "habit_completions", "journal_entries", "user_achievements"]) {
      const col = table === "profiles" ? "id" : "user_id";
      expect(await rows(`select count(*)::int as n from public.${table} where ${col} = $1`, [A])).toEqual([{ n: 0 }]);
    }
  });
});
