-- ============================================================================
-- 0011_line_notifications.sql
-- LINE OA notification foundation (Messaging API channel, separate from LIFF).
--
-- Note: as later discovered, LINE user ids are the same across channels of one
-- provider, so oa_user_id equals line_user_id (0012 auto-binds it at login).
-- The code-based linking below became unnecessary but is kept as it is already
-- applied everywhere.
--
-- Adds:
--   1. notified_at guards on if_sessions — the cron job can only send each
--      "phase finished" push once, even if it scans the same session again.
--   2. users.oa_user_id — the user's id on the Messaging API channel.
--   3. line_link_codes — the (now retired) one-time linking handshake.
--
-- Every statement is idempotent so node scripts/run-migration.mjs (or the
-- Supabase SQL editor) can run it repeatedly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- if_sessions: when each phase's "finished" push was sent (null = none yet).
-- ----------------------------------------------------------------------------
alter table public.if_sessions
  add column if not exists fasting_end_notified_at timestamptz,
  add column if not exists eating_end_notified_at timestamptz;

-- ----------------------------------------------------------------------------
-- users: the user id on the LINE OA (Messaging API) channel.
-- Unique (partial on non-null) so one OA account can never belong to two
-- app users. Duplicates would leak one user's health data to another.
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists oa_user_id text;

create unique index if not exists users_oa_user_id_key
  on public.users (oa_user_id)
  where oa_user_id is not null;

-- ----------------------------------------------------------------------------
-- line_link_codes: single-use, expiring codes for account linking.
-- ----------------------------------------------------------------------------
create table if not exists public.line_link_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(user_id) on delete cascade,
  code       text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists line_link_codes_user_idx
  on public.line_link_codes (user_id);

-- ----------------------------------------------------------------------------
-- Security: RLS on the new table + revoke anon/authenticated grants so the
-- publishable key cannot touch it. users/if_sessions grants were already
-- revoked in 0001/0002.
-- ----------------------------------------------------------------------------
alter table public.line_link_codes enable row level security;
revoke all on public.line_link_codes from anon, authenticated;