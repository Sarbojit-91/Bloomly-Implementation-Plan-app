import "server-only";
import type { Repo, Row } from "../types";
import { asUser, normalize } from "./db";

// Dates come back as text and numerics as numbers, matching what Supabase returns.
const HABIT_COLUMNS = `
  id, name, description, icon, color, category::text as category, schedule_days, weekly_goal,
  target_value::float8 as target_value, unit, reminder_time::text as reminder_time,
  created_on::text as created_on, archived_at, sort_order, created_at`;

/**
 * Local-mode data access. Every query runs through `asUser`, i.e. as the
 * `authenticated` role with row-level security enforced by Postgres; the
 * user_id filters are for clarity, not for security.
 */
export function localRepo(userId: string): Repo {
  const rows = async (sql: string, params: unknown[] = []): Promise<Row[]> =>
    asUser(userId, async (tx) => (await tx.query<Row>(sql, params)).rows.map(normalize));
  const one = async (sql: string, params: unknown[] = []) => (await rows(sql, params))[0] ?? null;

  return {
    getProfile: () =>
      one(`select display_name, timezone, theme, reminders_enabled from public.profiles where id = $1`, [userId]),
    async updateProfile(patch) {
      const entries = Object.entries(patch).filter(([, v]) => v !== undefined);
      if (entries.length === 0) return;
      const allowed = new Set(["display_name", "timezone", "theme", "reminders_enabled"]);
      const sets = entries.map(([k], i) => {
        if (!allowed.has(k)) throw new Error(`Unknown profile field ${k}`);
        return `${k} = $${i + 2}`;
      });
      await rows(`update public.profiles set ${sets.join(", ")} where id = $1`, [userId, ...entries.map(([, v]) => v)]);
    },

    listHabits: () =>
      rows(`select ${HABIT_COLUMNS} from public.habits where user_id = $1 order by sort_order, created_at`, [userId]),
    getHabit: (id) => one(`select ${HABIT_COLUMNS} from public.habits where id = $1 and user_id = $2`, [id, userId]),
    async insertHabit(h) {
      const row = await one(
        `insert into public.habits
           (user_id, name, description, icon, color, category, schedule_days, weekly_goal, target_value, unit,
            reminder_time, created_on, sort_order)
         values ($1, $2, $3, $4, $5, $6::public.habit_category, $7::smallint[], $8, $9, $10, $11::time, $12::date,
            (select coalesce(max(sort_order), 0) + 1 from public.habits where user_id = $1))
         returning id`,
        [
          userId,
          h.name,
          h.description,
          h.icon,
          h.color,
          h.category,
          h.schedule_days,
          h.weekly_goal,
          h.target_value,
          h.unit,
          h.reminder_time,
          h.created_on,
        ],
      );
      return String(row!.id);
    },
    async updateHabit(id, h) {
      const res = await rows(
        `update public.habits set name = $3, description = $4, icon = $5, color = $6,
           category = $7::public.habit_category, schedule_days = $8::smallint[], weekly_goal = $9,
           target_value = $10, unit = $11, reminder_time = $12::time
         where id = $1 and user_id = $2 returning id`,
        [
          id,
          userId,
          h.name,
          h.description,
          h.icon,
          h.color,
          h.category,
          h.schedule_days,
          h.weekly_goal,
          h.target_value,
          h.unit,
          h.reminder_time,
        ],
      );
      return res.length > 0;
    },
    async setHabitArchived(id, archived) {
      const res = await rows(
        `update public.habits set archived_at = ${archived ? "now()" : "null"} where id = $1 and user_id = $2 returning id`,
        [id, userId],
      );
      return res.length > 0;
    },
    async deleteHabit(id) {
      return (await rows(`delete from public.habits where id = $1 and user_id = $2 returning id`, [id, userId])).length > 0;
    },

    listCompletions: () =>
      rows(
        `select id, habit_id, completed_on::text as completed_on, value::float8 as value
         from public.habit_completions where user_id = $1 order by completed_on, id`,
        [userId],
      ),
    async upsertCompletion(habitId, date, value) {
      await rows(
        `insert into public.habit_completions (user_id, habit_id, completed_on, value) values ($1, $2, $3::date, $4)
         on conflict (habit_id, completed_on) do update set value = excluded.value`,
        [userId, habitId, date, value],
      );
    },
    async deleteCompletion(habitId, date) {
      await rows(`delete from public.habit_completions where habit_id = $1 and user_id = $2 and completed_on = $3::date`, [
        habitId,
        userId,
        date,
      ]);
    },

    listJournal: () =>
      rows(
        `select id, entry_date::text as entry_date, mood, reflection, notes, updated_at
         from public.journal_entries where user_id = $1 order by entry_date desc`,
        [userId],
      ),
    async countJournal() {
      const r = await one(`select count(*)::int as n from public.journal_entries where user_id = $1`, [userId]);
      return Number(r?.n ?? 0);
    },
    async upsertJournal(e) {
      await rows(
        `insert into public.journal_entries (user_id, entry_date, mood, reflection, notes) values ($1, $2::date, $3, $4, $5)
         on conflict (user_id, entry_date) do update
           set mood = excluded.mood, reflection = excluded.reflection, notes = excluded.notes`,
        [userId, e.entry_date, e.mood, e.reflection, e.notes],
      );
    },
    async deleteJournal(id) {
      return (await rows(`delete from public.journal_entries where id = $1 and user_id = $2 returning id`, [id, userId]))
        .length > 0;
    },

    listAchievements: () =>
      rows(`select key, habit_id, earned_at from public.user_achievements where user_id = $1 order by earned_at desc`, [
        userId,
      ]),
    async addAchievements(list) {
      for (const a of list) {
        await rows(
          `insert into public.user_achievements (user_id, key, habit_id) values ($1, $2, $3) on conflict do nothing`,
          [userId, a.key, a.habit_id],
        );
      }
    },
  };
}
