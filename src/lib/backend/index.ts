import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import type { AuthBackend, Repo } from "./types";

/**
 * Bloomly uses Supabase when its keys are configured, and otherwise falls
 * back to local mode (embedded Postgres + local accounts) so the app can be
 * run and tested with no external setup at all.
 */
export const backendMode: "supabase" | "local" = isSupabaseConfigured ? "supabase" : "local";
export const isLocalMode = backendMode === "local";

export async function getAuth(): Promise<AuthBackend> {
  return isLocalMode ? (await import("./local/auth")).localAuth : (await import("./supabase")).supabaseAuth;
}

/** Data access scoped to one user. Callers must pass the signed-in user's id. */
export async function repoFor(userId: string): Promise<Repo> {
  return isLocalMode ? (await import("./local/repo")).localRepo(userId) : (await import("./supabase")).supabaseRepo(userId);
}
