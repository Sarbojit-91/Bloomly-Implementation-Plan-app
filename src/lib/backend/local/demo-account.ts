/**
 * A ready-to-use, already-confirmed account for local test mode, so Bloomly
 * can be tried without any email setup. It only ever exists in the local
 * embedded database. Supabase mode never creates or shows it.
 *
 * If it's deleted from Settings, it's created again (empty) the next time the
 * dev server starts.
 */
export const DEMO_ACCOUNT = {
  email: "demo@bloomly.test",
  password: "BloomlyDemo2026",
  displayName: "Demo Gardener",
} as const;
