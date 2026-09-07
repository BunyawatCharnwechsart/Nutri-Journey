-- ============================================================================
-- 0024_if_sessions_mood_as_text.sql
-- Migrate the mood feedback from an integer rating to plain text.
--
-- In 0023 the mood was stored as `mood_rating integer` (1-5). The product
-- decided the database should store the human-readable English label instead
-- ("Very good" / "Good" / "Medium" / "Bad" / "Very bad"), so:
--
--   1. add `mood text` (nullable),
--   2. backfill it from `mood_rating` (1..5) for rows recorded pre-0024,
--   3. add a CHECK constraint limiting `mood` to the 5 known labels,
--   4. drop the now-obsolete `mood_rating` column (its CHECK constraint is
--      dropped along with the column automatically).
--
-- Idempotent: safe to re-run on every deploy (backfill is a no-op once `mood`
-- has a value; the constraint is guarded by a DO block; dropping a missing
-- column with "if exists" is a no-op).
--
-- Security: RLS + revoked grants re-asserted (idempotent) so only the
-- service-role server client can touch the table.
-- ============================================================================

alter table public.if_sessions
  add column if not exists mood text;

update public.if_sessions
  set mood = case mood_rating
    when 1 then 'Very bad'
    when 2 then 'Bad'
    when 3 then 'Medium'
    when 4 then 'Good'
    when 5 then 'Very good'
  end
  where mood is null
    and mood_rating is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'if_sessions_mood_check'
      and conrelid = 'public.if_sessions'::regclass
  ) then
    alter table public.if_sessions
      add constraint if_sessions_mood_check
      check (
        mood is null
        or mood in ('Very bad', 'Bad', 'Medium', 'Good', 'Very good')
      );
  end if;
end $$;

alter table public.if_sessions
  drop column if exists mood_rating;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- the table. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.if_sessions enable row level security;
revoke all on public.if_sessions from anon, authenticated;