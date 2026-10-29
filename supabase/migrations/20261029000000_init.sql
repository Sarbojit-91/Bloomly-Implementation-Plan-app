-- Bloomly schema: profiles, habits, completions, journal entries, achievements.
-- Every table is owned by a user and protected by row-level security.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.habit_category as enum ('health', 'fitness', 'learning', 'productivity', 'personal', 'mindfulness');

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 60),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 64),
  theme text not null default 'light' check (theme in ('light', 'dark', 'system')),
  reminders_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Habits
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  description text check (char_length(description) <= 280),
  icon text not null default 'Sprout' check (char_length(icon) <= 40),
  color text not null default 'violet' check (char_length(color) <= 20),
  category public.habit_category not null default 'personal',
  -- Weekdays the habit is planned for: 0 = Sunday … 6 = Saturday.
  schedule_days smallint[] not null default '{0,1,2,3,4,5,6}'
    check (cardinality(schedule_days) between 1 and 7 and schedule_days <@ '{0,1,2,3,4,5,6}'::smallint[]),
  -- How many scheduled days per week make a full week.
  weekly_goal smallint not null default 7
    check (weekly_goal between 1 and 7 and weekly_goal <= cardinality(schedule_days)),
  target_value numeric(10, 2) check (target_value is null or target_value > 0),
  unit text check (char_length(unit) <= 20),
  reminder_time time,
  -- Calendar date (in the user's timezone) the habit was created.
  created_on date not null default current_date,
  archived_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lets completions reference (id, user_id) so ownership can't be mixed up.
  unique (id, user_id)
);

create index habits_user_idx on public.habits (user_id, archived_at, sort_order);

-- ---------------------------------------------------------------------------
-- Completions: at most one row per habit per calendar day
-- ---------------------------------------------------------------------------
create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  habit_id uuid not null,
  completed_on date not null,
  value numeric(10, 2) check (value is null or value >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, completed_on),
  -- The completion's owner must be the habit's owner.
  foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);

create index habit_completions_user_date_idx on public.habit_completions (user_id, completed_on);

-- ---------------------------------------------------------------------------
-- Journal: one entry per user per day
-- ---------------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  entry_date date not null,
  mood smallint check (mood between 1 and 5),
  reflection text not null default '' check (char_length(reflection) <= 2000),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ---------------------------------------------------------------------------
-- Achievements: earned once, kept forever
-- ---------------------------------------------------------------------------
create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  key text not null check (char_length(key) <= 40),
  habit_id uuid references public.habits (id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique nulls not distinct (user_id, key, habit_id)
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger habits_updated_at before update on public.habits
  for each row execute function public.set_updated_at();
create trigger habit_completions_updated_at before update on public.habit_completions
  for each row execute function public.set_updated_at();
create trigger journal_entries_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Create a profile automatically when someone signs up
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'display_name', ''), 60),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row-level security: every row is visible only to its owner
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;
alter table public.journal_entries enable row level security;
alter table public.user_achievements enable row level security;

-- Profiles are created by the trigger and removed with the auth user.
create policy "profiles: owner can read" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: owner can update" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "habits: owner can read" on public.habits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "habits: owner can insert" on public.habits
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "habits: owner can update" on public.habits
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "habits: owner can delete" on public.habits
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "completions: owner can read" on public.habit_completions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "completions: owner can insert" on public.habit_completions
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid()))
  );
create policy "completions: owner can update" on public.habit_completions
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "completions: owner can delete" on public.habit_completions
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "journal: owner can read" on public.journal_entries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "journal: owner can insert" on public.journal_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "journal: owner can update" on public.journal_entries
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "journal: owner can delete" on public.journal_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Achievements are append-only for the owner; nobody edits them.
create policy "achievements: owner can read" on public.user_achievements
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "achievements: owner can insert" on public.user_achievements
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and (habit_id is null or exists (select 1 from public.habits h where h.id = habit_id and h.user_id = (select auth.uid())))
  );

-- Anonymous visitors get nothing.
revoke all on public.profiles, public.habits, public.habit_completions, public.journal_entries, public.user_achievements from anon;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.habits, public.habit_completions, public.journal_entries to authenticated;
grant select, insert on public.user_achievements to authenticated;
