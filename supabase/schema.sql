-- Tilt Filter — Supabase schema
-- Run this once in the Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / ON CONFLICT).

-- ============================================================
-- Trading accounts
-- ============================================================
create table if not exists accounts (
  id text primary key,
  name text not null,
  size numeric not null default 0,
  drawdown_type text not null,
  max_drawdown numeric not null,
  floor_level numeric,
  stop_trailing_at_floor boolean not null default true,
  current_balance numeric not null default 0,
  high_water_mark numeric not null default 0,
  active boolean not null default true,
  account_type text,
  status text,
  blown_date text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Completed trades
-- ============================================================
create table if not exists trades (
  id text primary key,
  order_number integer not null,
  "timestamp" text,
  date text,
  planned_status text,
  quality text,
  symbol text,
  risk_dollars numeric,
  risk_percent numeric,
  pnl numeric,
  r_multiple numeric,
  rules_held boolean,
  discipline text,
  discipline_selected boolean,
  take_profit_target numeric,
  name text,
  outcome text,
  emotional_state text,
  tilt_risk text,
  screenshot_url text,
  checklist_answers jsonb,
  rule_notes jsonb,
  notes text,
  memo text,
  account_id text references accounts(id) on delete set null,
  account_name text,
  link_group_id text,
  direction text,
  entry_price numeric,
  exit_price numeric,
  created_at timestamptz not null default now()
);

create index if not exists trades_date_idx on trades(date);
create index if not exists trades_account_id_idx on trades(account_id);

-- ============================================================
-- Daily scoreboard (one row per trading day)
-- ============================================================
create table if not exists daily_scoreboard (
  id text primary key,
  date text not null unique,
  day_label text,
  feel_level integer,
  sleep_level integer,
  sleep_quality text,
  focus_intention text,
  triggers_distractions text,
  morning_notes text,
  walk_out_notes text,
  daily_process_score integer,
  emotional_consistency_percent integer,
  rule_adherence_percent integer,
  trades_count integer default 0,
  planned_trades_count integer default 0,
  unplanned_trades_count integer default 0,
  well_managed_exits_count integer default 0,
  emotional_exits_count integer default 0,
  pnl numeric default 0,
  is_clean_day boolean,
  status text,
  session_outcome text,
  session_reflection text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Tilt events (frustration / chasing admissions)
-- ============================================================
create table if not exists tilt_events (
  id text primary key,
  trade_id text references trades(id) on delete set null,
  trade_order_number integer,
  trade_name text,
  "timestamp" text,
  feeling text,
  tilt_risk text,
  loss_amount numeric,
  notes text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- Desk messages (the "BUDDY" activity feed)
-- ============================================================
create table if not exists desk_messages (
  id text primary key,
  sender text,
  time text,
  text text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- App meta — single-row table for everything else:
-- day counter, clean streak, tilt score/tab, rules, tags, emotional tracker.
-- ============================================================
create table if not exists app_meta (
  id text primary key default 'singleton',
  current_view text,
  active_account_id text,
  rules jsonb,
  system_tags jsonb,
  emotional_tracker jsonb,
  clean_streak integer default 0,
  day_counter integer default 1,
  tilt_score integer default 0,
  tilt_tab numeric default 0,
  current_tier text,
  custom_risk_input text,
  selected_sizing_tier text,
  discord_webhook_enabled boolean default false,
  discord_webhook_url text,
  updated_at timestamptz not null default now()
);

insert into app_meta (id) values ('singleton')
  on conflict (id) do nothing;

-- ============================================================
-- Row Level Security
-- This is a single-user personal app (no login system), so every table
-- is opened up to the publishable API key with no per-row restriction.
-- Note: the publishable key ships inside the client JS bundle by design
-- (that's what "publishable" means), so this is exactly as private as
-- the app itself — same trust boundary as the current localStorage-only
-- version, just durable now. If multi-user / auth is ever added later,
-- these policies should be tightened to filter by user id.
-- ============================================================
alter table accounts enable row level security;
alter table trades enable row level security;
alter table daily_scoreboard enable row level security;
alter table tilt_events enable row level security;
alter table desk_messages enable row level security;
alter table app_meta enable row level security;

drop policy if exists "public full access" on accounts;
drop policy if exists "public full access" on trades;
drop policy if exists "public full access" on daily_scoreboard;
drop policy if exists "public full access" on tilt_events;
drop policy if exists "public full access" on desk_messages;
drop policy if exists "public full access" on app_meta;

create policy "public full access" on accounts for all using (true) with check (true);
create policy "public full access" on trades for all using (true) with check (true);
create policy "public full access" on daily_scoreboard for all using (true) with check (true);
create policy "public full access" on tilt_events for all using (true) with check (true);
create policy "public full access" on desk_messages for all using (true) with check (true);
create policy "public full access" on app_meta for all using (true) with check (true);
