-- ============================================================================
-- 0007_add_fasting_columns.sql
-- Rename the generic fasting columns to explicit fasting_* names so the
-- schema is symmetric with the eating phase:
--
--   start_time           -> fasting_start_time
--   end_time             -> fasting_end_time
--   duration_minutes     -> fasting_duration_minutes
--
-- Existing rows are backfilled from the old columns before they are dropped.
-- The app always sets fasting_start_time (it is the moment the fasting phase
-- begins), so the column is made NOT NULL after backfilling. Indexes used by
-- the most common queries (monthly calendar, today summary, active session)
-- are recreated on the new column names.
--
-- MUST be applied in the same release as the code that switches to the new
-- column names (the code reads/writes fasting_* only).
-- ============================================================================

alter table public.if_sessions
  add column if not exists fasting_start_time timestamptz,
  add column if not exists fasting_end_time timestamptz,
  add column if not exists fasting_duration_minutes integer;

update public.if_sessions
  set fasting_start_time = start_time,
      fasting_end_time = end_time,
      fasting_duration_minutes = duration_minutes
  where fasting_start_time is null;

alter table public.if_sessions
  alter column fasting_start_time set not null;

alter table public.if_sessions
  drop column if exists start_time,
  drop column if exists end_time,
  drop column if exists duration_minutes;

create index if not exists if_sessions_user_fasting_start_idx
  on public.if_sessions (user_id, fasting_start_time);

create index if not exists if_sessions_user_status_idx
  on public.if_sessions (user_id, status);