-- ============================================================================
-- 0014_line_friendship_cache.sql
--
-- Cache the OA "is the user a friend?" answer so the UI does not call the
-- LINE API on every dashboard load. The cache expires after a few minutes
-- (see FRIENDSHIP_CACHE_TTL_MS in lib/line-friendship.ts) and the check is
-- forced whenever the user hits "เพิ่มเพื่อนแล้ว กดตรวจสอบ" / "เปิด".
--
--   line_friend               – last known friendship answer (bool).
--   line_friendship_checked_at– when that answer was written.
--
-- line_unreachable (0012) stays as the cron's "stop pushing" signal and is
-- kept in sync by the same writes.
--
-- Idempotent (runnable repeatedly).
-- ============================================================================

alter table public.users
  add column if not exists line_friend boolean
    not null default false;

alter table public.users
  add column if not exists line_friendship_checked_at timestamptz;

-- Security: re-assert the publishable (anon / authenticated) key cannot touch
-- users. RLS stays enabled from 0001.
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;