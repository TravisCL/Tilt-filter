-- Adds Discord webhook settings to app_meta (single-row settings table).
-- Run this once in the SQL Editor. Safe to re-run (IF NOT EXISTS).

alter table app_meta add column if not exists discord_webhook_enabled boolean default false;
alter table app_meta add column if not exists discord_webhook_url text;
