# Bloomly 🌸

A calm, encouraging habit tracker that makes consistency feel good. Plan habits around your real week, check them off
with a satisfying tap, and watch your progress bloom, without ever being scolded for a missed day.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + Postgres with row-level security) ·
Recharts · Motion · Vitest

---

## Getting started

### Quick start: local test mode (no accounts or keys needed)

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up. With no Supabase keys set, Bloomly runs in **local test
mode**:

- Data is stored in an embedded Postgres database in `.bloomly-data/` in this folder. It survives restarts; delete the
  folder to start fresh.
- It uses the **same schema and row-level security** as the Supabase setup (the SQL in `supabase/migrations` runs
  automatically).
- Accounts are local: passwords are hashed with scrypt and sessions are HttpOnly cookies.
- No real emails are sent. Confirmation and password-reset emails appear in the **dev mailbox** at
  [http://localhost:3000/dev/mailbox](http://localhost:3000/dev/mailbox). Click the link there to confirm your account.
- A dark strip at the top of every page shows that you're in local test mode.
- A **demo account** is already registered and confirmed. Click **Use demo account** on the sign-in page; its details
  are shown there and live in [`src/lib/backend/local/demo-account.ts`](src/lib/backend/local/demo-account.ts). If you
  delete it, it's recreated (empty) the next time the dev server starts.

Local test mode is for trying Bloomly on your own computer. For a real deployment, connect Supabase as described below.
Once the Supabase keys are set, Bloomly switches to Supabase automatically.

### Production setup with Supabase

#### 1. Create a Supabase project

1. Sign up at [supabase.com](https://supabase.com) and create a new (free) project.
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/migrations/20261029000000_init.sql`](supabase/migrations/20261029000000_init.sql) and click **Run**.
   This creates the tables, the profile trigger and all row-level security policies.
3. Go to **Authentication → URL Configuration** and set:
   - **Site URL:** `http://localhost:3000`
   - **Redirect URLs:** add `http://localhost:3000/auth/confirm`
4. Make sure **Authentication → Sign In / Providers → Email** is enabled with **Confirm email** turned on.

> Supabase's built-in email sender is fine for development but is rate-limited to a few emails per hour. For
> production, add your own SMTP provider under **Authentication → Emails → SMTP Settings**.

#### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the values from **Project Settings → API** (or **API Keys**):

| Variable | Where it's used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server (the public "anon"/"publishable" key; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Used solely to delete an account. Never expose it. |
| `NEXT_PUBLIC_SITE_URL` | Base URL for links in confirmation/reset emails |

#### 3. Run it

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, confirm your email, and start growing.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | All tests (domain logic + database security) |
| `npm run test:rls` | Just the database/RLS tests |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |

## How it works

### Schedules, streaks and rates

The logic lives in [`src/lib/habits/`](src/lib/habits) as pure, framework-free functions with tests.

- A habit has **scheduled weekdays** and a **weekly goal**. When the goal equals the number of scheduled days the habit
  is *strict* (every scheduled day is expected). When it's lower, e.g. "3× a week, any day", it's *flexible*.
- **Streaks** count only scheduled days, so a Mon/Wed/Fri habit is never "missed" on Tuesday. Flexible habits count
  streaks in weeks where the goal was met. Today (or this week) never breaks a streak while it's still in progress.
- **Completion rates** count only scheduled days since the habit started. Today only counts once it's done.
- **Achievements** are computed from stored records and saved idempotently, so they're never faked and never taken
  away.

### Dates and timezones

Completions and journal entries are stored as plain calendar dates (`date` columns) in the user's own timezone, which
is detected at sign-up and editable in Settings. The server works out "today" in that timezone and rejects
future-dated check-ins. Travelling never shifts past records.

### Privacy and security

- Every table has **row-level security**: users can only read and write rows where `user_id = auth.uid()`. Completions
  also reference `(habit_id, user_id)` together, so nobody can log against someone else's habit.
- All reads and writes run through the signed-in user's session on the server (Server Components, Server Actions and
  Route Handlers), and each action re-checks the user. The service-role key sits in a `server-only` module and is only
  used to delete an account.
- Deleting an account removes the auth user, and `ON DELETE CASCADE` removes all of their data.
- [`tests/rls.test.ts`](tests/rls.test.ts) runs the real migration in an embedded Postgres (PGlite) and proves users
  can't see or modify each other's data.

### Reminders

Reminders work **while Bloomly is open in a browser tab** (it can be in the background). At a habit's reminder time,
if it isn't done yet, Bloomly shows an in-app banner and, if you allowed it, a browser notification. If notifications
are blocked or unsupported, you still get the in-app banner. Bloomly doesn't send emails or push notifications while
it's closed. That would need Web Push and a scheduled job, which is a natural next step.

## Deploying

Deploy to Vercel (or any Node host): set the four environment variables, set `NEXT_PUBLIC_SITE_URL` to your domain, and
add `https://your-domain/auth/confirm` to Supabase's redirect URLs.
