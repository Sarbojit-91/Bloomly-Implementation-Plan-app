/**
 * The two things Bloomly needs from a backend: authentication and a
 * user-scoped data store. There are two implementations:
 *
 * - `supabase` — Supabase Auth + Postgres (used when Supabase keys are set).
 * - `local`    — an embedded Postgres (PGlite) stored on disk with local
 *                email/password accounts, for trying Bloomly without any
 *                external services. It runs the same migration and the same
 *                row-level security policies.
 *
 * Rows use the database's snake_case column names; `src/lib/data.ts` maps
 * them to the app's types.
 */

export type Row = Record<string, unknown>;

export interface SessionUser {
  id: string;
  email: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthBackend {
  getSessionUser(): Promise<SessionUser | null>;
  signUp(input: {
    email: string;
    password: string;
    displayName: string;
    timezone: string;
    confirmUrl: string;
  }): Promise<{ error?: AuthError; signedIn?: boolean }>;
  signIn(email: string, password: string): Promise<{ error?: AuthError }>;
  resendConfirmation(email: string, confirmUrl: string): Promise<{ error?: AuthError }>;
  requestPasswordReset(email: string, resetUrl: string): Promise<{ error?: AuthError }>;
  /** Handles the link from a confirmation or reset email. */
  confirm(params: { code?: string | null; tokenHash?: string | null; type?: string | null }): Promise<{ ok: boolean }>;
  updatePassword(password: string): Promise<{ error?: AuthError }>;
  signOut(): Promise<void>;
  /** Deletes the user and, through ON DELETE CASCADE, all of their data. */
  deleteAccount(userId: string): Promise<{ error?: AuthError }>;
}

export interface HabitWrite {
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  schedule_days: number[];
  weekly_goal: number;
  target_value: number | null;
  unit: string | null;
  reminder_time: string | null;
}

export interface ProfilePatch {
  display_name?: string;
  timezone?: string;
  theme?: string;
  reminders_enabled?: boolean;
}

/** Data access for one signed-in user. Every method only touches that user's rows. */
export interface Repo {
  getProfile(): Promise<Row | null>;
  updateProfile(patch: ProfilePatch): Promise<void>;

  listHabits(): Promise<Row[]>;
  getHabit(id: string): Promise<Row | null>;
  insertHabit(habit: HabitWrite & { created_on: string }): Promise<string>;
  /** Returns false when the habit doesn't exist (or isn't this user's). */
  updateHabit(id: string, habit: HabitWrite): Promise<boolean>;
  setHabitArchived(id: string, archived: boolean): Promise<boolean>;
  deleteHabit(id: string): Promise<boolean>;

  listCompletions(): Promise<Row[]>;
  upsertCompletion(habitId: string, date: string, value: number | null): Promise<void>;
  deleteCompletion(habitId: string, date: string): Promise<void>;

  listJournal(): Promise<Row[]>;
  countJournal(): Promise<number>;
  upsertJournal(entry: { entry_date: string; mood: number | null; reflection: string; notes: string }): Promise<void>;
  deleteJournal(id: string): Promise<boolean>;

  listAchievements(): Promise<Row[]>;
  /** Inserts achievements, silently skipping ones already earned. */
  addAchievements(list: { key: string; habit_id: string | null }[]): Promise<void>;
}
