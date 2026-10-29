import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthBackend, Repo, Row } from "./types";

type Result<T> = { data: T; error: { message: string } | null };

function check<T>(res: Result<T>): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const PAGE = 1000;

/** PostgREST caps responses at 1000 rows, so page through larger result sets. */
async function fetchAll(query: (from: number, to: number) => PromiseLike<Result<Row[] | null>>): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const data = check(await query(from, from + PAGE - 1)) ?? [];
    out.push(...data);
    if (data.length < PAGE) return out;
  }
}

export const supabaseAuth: AuthBackend = {
  async getSessionUser() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub) return null;
    return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : "" };
  },

  async signUp({ email, password, displayName, timezone, confirmUrl }) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: confirmUrl, data: { display_name: displayName, timezone } },
    });
    if (error) return { error: { message: error.message, code: error.code } };
    return { signedIn: Boolean(data.session) };
  },

  async signIn(email, password) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { error: { message: error.message, code: error.code } } : {};
  },

  async resendConfirmation(email, confirmUrl) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: confirmUrl } });
    return error ? { error: { message: error.message, code: error.code } } : {};
  },

  async requestPasswordReset(email, resetUrl) {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetUrl });
    return error ? { error: { message: error.message, code: error.code } } : {};
  },

  async confirm({ code, tokenHash, type }) {
    const supabase = await createClient();
    if (code) return { ok: !(await supabase.auth.exchangeCodeForSession(code)).error };
    if (tokenHash && type) {
      return { ok: !(await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash: tokenHash })).error };
    }
    return { ok: false };
  },

  async updatePassword(password) {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    return error ? { error: { message: error.message, code: error.code } } : {};
  },

  async signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
  },

  async deleteAccount(userId) {
    let admin;
    try {
      admin = createAdminClient();
    } catch {
      return { error: { message: "Account deletion isn't set up on this server yet (missing service role key)." } };
    }
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) return { error: { message: "We couldn't delete your account. Please try again in a moment." } };
    await this.signOut();
    return {};
  },
};

export async function supabaseRepo(userId: string): Promise<Repo> {
  const supabase = await createClient();

  return {
    async getProfile() {
      return check(
        await supabase
          .from("profiles")
          .select("display_name, timezone, theme, reminders_enabled")
          .eq("id", userId)
          .maybeSingle(),
      );
    },
    async updateProfile(patch) {
      check(await supabase.from("profiles").update(patch).eq("id", userId));
    },

    listHabits: () =>
      fetchAll((from, to) =>
        supabase.from("habits").select("*").eq("user_id", userId).order("sort_order").order("created_at").range(from, to),
      ),
    async getHabit(id) {
      return check(await supabase.from("habits").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
    },
    async insertHabit(habit) {
      const last = check(
        await supabase
          .from("habits")
          .select("sort_order")
          .eq("user_id", userId)
          .order("sort_order", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      const row = check(
        await supabase
          .from("habits")
          .insert({ ...habit, user_id: userId, sort_order: (last?.sort_order ?? 0) + 1 })
          .select("id")
          .single(),
      );
      return String(row!.id);
    },
    async updateHabit(id, habit) {
      const rows = check(await supabase.from("habits").update(habit).eq("id", id).eq("user_id", userId).select("id"));
      return (rows ?? []).length > 0;
    },
    async setHabitArchived(id, archived) {
      const rows = check(
        await supabase
          .from("habits")
          .update({ archived_at: archived ? new Date().toISOString() : null })
          .eq("id", id)
          .eq("user_id", userId)
          .select("id"),
      );
      return (rows ?? []).length > 0;
    },
    async deleteHabit(id) {
      const rows = check(await supabase.from("habits").delete().eq("id", id).eq("user_id", userId).select("id"));
      return (rows ?? []).length > 0;
    },

    listCompletions: () =>
      fetchAll((from, to) =>
        supabase
          .from("habit_completions")
          .select("id, habit_id, completed_on, value")
          .eq("user_id", userId)
          .order("completed_on")
          .order("id")
          .range(from, to),
      ),
    async upsertCompletion(habitId, date, value) {
      check(
        await supabase
          .from("habit_completions")
          .upsert({ user_id: userId, habit_id: habitId, completed_on: date, value }, { onConflict: "habit_id,completed_on" }),
      );
    },
    async deleteCompletion(habitId, date) {
      check(
        await supabase
          .from("habit_completions")
          .delete()
          .eq("habit_id", habitId)
          .eq("user_id", userId)
          .eq("completed_on", date),
      );
    },

    listJournal: () =>
      fetchAll((from, to) =>
        supabase
          .from("journal_entries")
          .select("*")
          .eq("user_id", userId)
          .order("entry_date", { ascending: false })
          .range(from, to),
      ),
    async countJournal() {
      const { count, error } = await supabase
        .from("journal_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
    async upsertJournal(entry) {
      check(await supabase.from("journal_entries").upsert({ ...entry, user_id: userId }, { onConflict: "user_id,entry_date" }));
    },
    async deleteJournal(id) {
      const rows = check(await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", userId).select("id"));
      return (rows ?? []).length > 0;
    },

    async listAchievements() {
      const rows = check(
        await supabase
          .from("user_achievements")
          .select("key, habit_id, earned_at")
          .eq("user_id", userId)
          .order("earned_at", { ascending: false }),
      );
      return rows ?? [];
    },
    async addAchievements(list) {
      if (list.length === 0) return;
      check(
        await supabase
          .from("user_achievements")
          .upsert(
            list.map((a) => ({ ...a, user_id: userId })),
            { onConflict: "user_id,key,habit_id", ignoreDuplicates: true },
          ),
      );
    },
  };
}
