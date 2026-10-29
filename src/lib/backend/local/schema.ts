/**
 * A small stand-in for the parts of Supabase's `auth` schema that the
 * migration relies on (`auth.users`, `auth.uid()`, the `anon` and
 * `authenticated` roles), plus the tables local mode needs for its own
 * accounts: sessions, one-time email tokens and a dev mailbox.
 *
 * None of the `auth` tables are granted to the `authenticated` role, so app
 * queries (which run as that role) can never read passwords or sessions.
 */
export const LOCAL_AUTH_SCHEMA = `
  do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
  do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;

  create schema auth;

  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text unique,
    encrypted_password text,
    raw_user_meta_data jsonb not null default '{}'::jsonb,
    email_confirmed_at timestamptz,
    created_at timestamptz not null default now()
  );

  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;

  create table auth.sessions (
    token_hash text primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    expires_at timestamptz not null
  );

  create table auth.one_time_tokens (
    token_hash text primary key,
    user_id uuid not null references auth.users (id) on delete cascade,
    type text not null check (type in ('signup', 'recovery')),
    expires_at timestamptz not null
  );

  -- Local mode doesn't send real email; messages land here instead.
  create table auth.dev_outbox (
    id bigint generated always as identity primary key,
    to_email text not null,
    subject text not null,
    body text not null,
    link text not null,
    created_at timestamptz not null default now()
  );

  create table auth.local_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );

  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
`;
