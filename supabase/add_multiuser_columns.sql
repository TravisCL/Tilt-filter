-- Multi-user migration: adds per-user data isolation on top of the base
-- schema.sql. Run schema.sql FIRST on a fresh project, then this.
--
-- On the dev/staging project: safe to run any time.
-- On the production project (later, at cutover): run this only once
-- Milestone 2 actually starts, and expect existing rows to need a manual
-- backfill afterward (see the cutover notes — existing rows have no
-- user_id yet, so RLS will hide them from everyone until backfilled).

-- ============================================================
-- 1. Add user_id to every table
-- ============================================================
alter table accounts add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table trades add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table daily_scoreboard add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table tilt_events add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table desk_messages add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table app_meta add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists accounts_user_id_idx on accounts(user_id);
create index if not exists trades_user_id_idx on trades(user_id);
create index if not exists daily_scoreboard_user_id_idx on daily_scoreboard(user_id);
create index if not exists tilt_events_user_id_idx on tilt_events(user_id);
create index if not exists desk_messages_user_id_idx on desk_messages(user_id);
create index if not exists app_meta_user_id_idx on app_meta(user_id);

-- ============================================================
-- 2. daily_scoreboard's date uniqueness was global ("one row per date,
-- period") — needs to become per-user instead, since two different users
-- can both have a scoreboard row for the same date.
--
-- Also: the app generates some scoreboard ids deterministically from the
-- date alone (e.g. "sb-today-2026-09-28", no per-user salt), so two
-- different users checking in on the same date would collide on the
-- primary key. Fix: drop the PK constraint on id (demote it to a plain,
-- non-unique column — the app still uses it as an object key, it just no
-- longer needs to be globally unique) and make (user_id, date) the real
-- uniqueness guarantee instead.
-- ============================================================
alter table daily_scoreboard drop constraint if exists daily_scoreboard_date_key;
alter table daily_scoreboard drop constraint if exists daily_scoreboard_pkey;
create unique index if not exists daily_scoreboard_user_date_idx on daily_scoreboard(user_id, date);

-- ============================================================
-- 3. app_meta stops being a single shared "singleton" row — becomes one
-- row per user instead, keyed by user_id.
-- ============================================================
alter table app_meta drop constraint if exists app_meta_pkey;
alter table app_meta add constraint app_meta_user_id_key unique (user_id);
-- Dropping the primary key removes Postgres's default "replica identity",
-- which Realtime needs to process DELETEs on this table (it's in the
-- realtime publication — see enable_realtime.sql). Without this, deleting
-- any app_meta row fails with "cannot delete ... no replica identity".
alter table app_meta replica identity full;

-- ============================================================
-- 4. Row Level Security — replace the open "public full access" policies
-- with per-user isolation. Every table's rows are only visible/writable
-- by the user_id that owns them.
-- ============================================================
drop policy if exists "public full access" on accounts;
drop policy if exists "public full access" on trades;
drop policy if exists "public full access" on daily_scoreboard;
drop policy if exists "public full access" on tilt_events;
drop policy if exists "public full access" on desk_messages;
drop policy if exists "public full access" on app_meta;

create policy "own rows only" on accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on daily_scoreboard
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on tilt_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on desk_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows only" on app_meta
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- 5. The old singleton seed row ('singleton', no user_id) is now
-- orphaned/invisible under RLS — harmless to leave, but clean it up so it
-- doesn't linger as dead data on a fresh dev project.
-- ============================================================
delete from app_meta where user_id is null;
