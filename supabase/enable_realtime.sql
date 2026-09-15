-- Enables live cross-device sync: adds all app tables to Supabase's
-- realtime publication so every connected device gets pushed changes
-- instantly instead of only syncing on page load/refresh.
-- Run this once in the SQL Editor (safe to re-run).

alter publication supabase_realtime add table accounts;
alter publication supabase_realtime add table trades;
alter publication supabase_realtime add table daily_scoreboard;
alter publication supabase_realtime add table tilt_events;
alter publication supabase_realtime add table desk_messages;
alter publication supabase_realtime add table app_meta;
