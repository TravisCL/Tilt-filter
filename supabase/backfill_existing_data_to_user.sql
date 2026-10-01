-- Milestone 2 cutover: one-time backfill assigning Travis's existing
-- single-tenant data (every row currently has user_id = null) to his real
-- authenticated account.
--
-- HOW TO USE:
-- 1. Have Travis sign up for real on the live site first (after the schema
--    migration + deploy are done). This creates his row in auth.users.
-- 2. Get his user id: in the Supabase dashboard, Authentication > Users,
--    find his email, copy the UUID. Or run:
--      select id, email from auth.users where email = 'travis@example.com';
-- 3. Replace every <TRAVIS_USER_ID> below with that UUID (keep the quotes).
-- 4. Run the "before" counts, then the updates, then the "after" counts —
--    confirm the numbers match (nothing silently skipped) before moving on.
--
-- Safe to run only ONCE — after the first run, no rows will have
-- user_id = null anymore, so re-running is a no-op (not harmful, just does
-- nothing on a second run).

-- --- BEFORE: row counts per table with no owner yet ---
select 'accounts' as table_name, count(*) from accounts where user_id is null
union all
select 'trades', count(*) from trades where user_id is null
union all
select 'daily_scoreboard', count(*) from daily_scoreboard where user_id is null
union all
select 'tilt_events', count(*) from tilt_events where user_id is null
union all
select 'desk_messages', count(*) from desk_messages where user_id is null
union all
select 'app_meta', count(*) from app_meta where user_id is null;

-- --- THE BACKFILL ---
update accounts set user_id = '<TRAVIS_USER_ID>' where user_id is null;
update trades set user_id = '<TRAVIS_USER_ID>' where user_id is null;
update daily_scoreboard set user_id = '<TRAVIS_USER_ID>' where user_id is null;
update tilt_events set user_id = '<TRAVIS_USER_ID>' where user_id is null;
update desk_messages set user_id = '<TRAVIS_USER_ID>' where user_id is null;

-- app_meta: Travis signing up will have already created a FRESH empty
-- app_meta row for him (via the normal app_meta upsert-on-user_id flow).
-- We don't want two rows for the same user — delete that fresh empty one
-- first, then backfill the real historical one onto his account.
delete from app_meta where user_id = '<TRAVIS_USER_ID>';
update app_meta set user_id = '<TRAVIS_USER_ID>', id = concat('meta-', '<TRAVIS_USER_ID>') where user_id is null;

-- --- AFTER: confirm nothing's left unowned, and his account now has everything ---
select 'accounts' as table_name, count(*) as unowned_remaining from accounts where user_id is null
union all
select 'trades', count(*) from trades where user_id is null
union all
select 'daily_scoreboard', count(*) from daily_scoreboard where user_id is null
union all
select 'tilt_events', count(*) from tilt_events where user_id is null
union all
select 'desk_messages', count(*) from desk_messages where user_id is null
union all
select 'app_meta', count(*) from app_meta where user_id is null;

select 'accounts' as table_name, count(*) as now_owned_by_travis from accounts where user_id = '<TRAVIS_USER_ID>'
union all
select 'trades', count(*) from trades where user_id = '<TRAVIS_USER_ID>'
union all
select 'daily_scoreboard', count(*) from daily_scoreboard where user_id = '<TRAVIS_USER_ID>'
union all
select 'tilt_events', count(*) from tilt_events where user_id = '<TRAVIS_USER_ID>'
union all
select 'desk_messages', count(*) from desk_messages where user_id = '<TRAVIS_USER_ID>'
union all
select 'app_meta', count(*) from app_meta where user_id = '<TRAVIS_USER_ID>';
