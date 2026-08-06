-- ============================================================================
-- 0001_auth_tables.sql
-- LINE login (custom JWT) foundation: users + profiles tables with RLS.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- users: one row per LINE account (identified by line_user_id).
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  user_id       uuid primary key default gen_random_uuid(),
  line_user_id  text not null unique,
  display_name  text,
  avatar_url    text,
  email         text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- profiles: health/personal settings, 1:1 with users.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id       uuid primary key references public.users(user_id) on delete cascade,
  weight        numeric,
  height        numeric,
  gender        text,
  birth_date    date,
  goal          text,
  if_pattern    text,
  target_weight numeric,
  target_date   date,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- The server reads/writes with the service role key, which bypasses RLS, and
-- enforces user scoping in code (every query filters by user_id, which comes
-- from the verified session cookie). RLS + revoked grants on the anon role are
-- defense-in-depth so the publishable key cannot touch these tables directly.
-- ----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.profiles enable row level security;

revoke all on public.users from anon, authenticated;
revoke all on public.profiles from anon, authenticated;
