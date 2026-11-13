-- M12: lets each user remove optional pre-trade checklist questions (R1-R3, Q5).
-- Q4 (Risk) is mandatory and is never stored here.
-- Additive + safe to re-run. Existing rows get '[]' = nothing removed (no behaviour change).
-- Run once in the SQL Editor.

alter table app_meta add column if not exists disabled_questions jsonb default '[]'::jsonb;
