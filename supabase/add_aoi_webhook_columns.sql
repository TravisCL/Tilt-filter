-- Adds the private creator-only AOI webhook settings to app_meta.
-- Run this once in the SQL Editor. Safe to re-run (IF NOT EXISTS).

alter table app_meta add column if not exists aoi_webhook_enabled boolean default false;
alter table app_meta add column if not exists aoi_webhook_url text;
