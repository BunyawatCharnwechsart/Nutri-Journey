-- ============================================================================
-- 0023_add_if_sessions_mood_rating.sql
-- Add a mood rating to IF sessions (the end-of-fast "emoji" feedback).
--
-- When the user finishes a fasting session (POST /if-sessions/end) they pick
-- one of 5 levels, stored as an integer 1-5 (1=very_bad ... 5=very_good).
-- The calendar groups sessions by fasting_start_time, so one rating on the
-- session row is all the calendar needs to show an emoji in the top-right of
-- that day's cell.
--
-- The column is nullable on purpose: sessions completed before this migration
-- simply show no emoji. The API validates 1..5 with Zod AND this CHECK
-- constraint, so invalid values can never reach the table.
--
-- Idempotent: "add column if not exists" + a DO block guard on the constraint
-- so the deploy workflow can re-run the whole folder safely.
-- ============================================================================

alter table public.if_sessions
  add column if not exists mood_rating integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'if_sessions_mood_rating_check'
      and conrelid = 'public.if_sessions'::regclass
  ) then
    alter table public.if_sessions
      add constraint if_sessions_mood_rating_check
      check (mood_rating is null or mood_rating between 1 and 5);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- the table. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.if_sessions enable row level security;
revoke all on public.if_sessions from anon, authenticated;