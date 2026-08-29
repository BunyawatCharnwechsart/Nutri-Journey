-- ============================================================================
-- 0012_line_auto_bind.sql
-- Switch LINE notification linking from a one-time-code protocol to automatic
-- binding.
--
-- LINE user IDs are scoped by provider: as long as the LIFF login channel and
-- the Messaging API (OA) channel belong to the SAME provider, a user has the
-- SAME `U...` id on both. So `users.oa_user_id` is reliably `line_user_id`
-- (verified server-side from the login idToken / webhook source.userId), and
-- the old "[NJ-LINK] <code>" handshake is no longer needed.
--
-- This migration adds two flags on users:
--   1. line_notifications_enabled  – opt-out switch; DELETE link sets it false.
--   2. line_unreachable            – the user unfriended/blocked the OA, set by
--                                    `unfollow` or a 404 friendship check, so
--                                    the cron stops pushing until a new
--                                    `follow` event / successful re-check.
--
-- Idempotent (runnable repeatedly).
-- ============================================================================

alter table public.users
  add column if not exists line_notifications_enabled boolean
    not null default true;

alter table public.users
  add column if not exists line_unreachable boolean
    not null default false;

-- Security: re-assert on the new columns that the publishable (anon /
-- authenticated) key cannot touch users. RLS stays enabled from 0001.
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;