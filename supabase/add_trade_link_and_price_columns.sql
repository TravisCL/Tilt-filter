-- Adds Copy Trade linking + direction/entry/exit price capture to trades.
-- Run this once in the SQL Editor. Safe to re-run (IF NOT EXISTS).

alter table trades add column if not exists link_group_id text;
alter table trades add column if not exists direction text;
alter table trades add column if not exists entry_price numeric;
alter table trades add column if not exists exit_price numeric;
