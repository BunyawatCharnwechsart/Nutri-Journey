-- ============================================================================
-- 0041_seasons_banners.sql
--
-- Seasons rank (reset ทุก 3 เดือน, calendar quarter ICT) + Banner Top 1-3.
--
-- Adds:
--   1. seasons — 1 แถว/quarter: season_key UNIQUE เช่น "2026-Q4",
--      year/quarter/starts_at/ends_at (ICT wall-clock เก็บเป็น timestamptz),
--      status ('active'/'closed'), closed_at.
--   2. season_rankings — snapshot ตอนปิด season: 1 แถว/user/season,
--      rank/season_points/banner ('gold'/'silver'/'bronze'/null).
--      UNIQUE (season_id, user_id) กัน snapshot ซ้ำ.
--   3. healthy_journey.season_points — แต้มเฉพาะ season ปัจจุบันไว้จัดอันดับ.
--      total_points (lifetime) ไม่ถูกรีเซ็ต — level/ไข่คงเดิม.
--   4. users.active_banner — banner ที่สวมอยู่ 1 ชิ้น
--      ('gold'/'silver'/'bronze'/null). ownership ตรวจฝั่งโค้ด
--      (ต้องมี season_rankings rank ตรงกัน) ไม่ใช่ FK.
--   5. seed season ปัจจุบันเป็น 'active' (upsert by season_key, idempotent).
--
-- Security: RLS + revoked grants — service-role server เท่านั้น (เหมือนทุกตาราง).
-- Idempotent: รันซ้ำได้ทุก statement.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- seasons: 1 แถวต่อ quarter.
-- ----------------------------------------------------------------------------
create table if not exists public.seasons (
  id          uuid primary key default gen_random_uuid(),
  season_key  text not null unique,
  year        integer not null check (year >= 2020 and year <= 2100),
  quarter     integer not null check (quarter >= 1 and quarter <= 4),
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  status      text not null default 'active' check (status in ('active', 'closed')),
  closed_at   timestamptz,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- season_rankings: snapshot ตอนปิด season (Top 1-3 ได้ banner).
-- ----------------------------------------------------------------------------
create table if not exists public.season_rankings (
  id            uuid primary key default gen_random_uuid(),
  season_id     uuid not null references public.seasons(id) on delete cascade,
  user_id       uuid not null references public.users(user_id) on delete cascade,
  rank          integer not null check (rank >= 1),
  season_points integer not null default 0 check (season_points >= 0),
  banner        text check (banner is null or banner in ('gold', 'silver', 'bronze')),
  created_at    timestamptz not null default now()
);

-- กัน snapshot ซ้ำ: 1 user มีได้ 1 แถวต่อ season.
create unique index if not exists season_rankings_season_user_key
  on public.season_rankings (season_id, user_id);

-- query หลัก: banner ที่ user เคยได้ (นับสะสมถาวร).
create index if not exists season_rankings_user_banner_idx
  on public.season_rankings (user_id, banner)
  where banner is not null;

-- ----------------------------------------------------------------------------
-- healthy_journey.season_points + users.active_banner.
-- ----------------------------------------------------------------------------
alter table public.healthy_journey
  add column if not exists season_points integer not null default 0;

alter table public.users
  add column if not exists active_banner text;

-- CHECK เก่าอาจค้างถ้ารันซ้ำ — ลบก่อนสร้างใหม่แบบ guard ด้วย DO block.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_active_banner_check'
  ) then
    alter table public.users
      add constraint users_active_banner_check
      check (active_banner is null or active_banner in ('gold', 'silver', 'bronze'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'healthy_journey_season_points_check'
  ) then
    alter table public.healthy_journey
      add constraint healthy_journey_season_points_check
      check (season_points >= 0);
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- Security — service-role only, app enforces user_id in code.
-- ----------------------------------------------------------------------------
alter table public.seasons enable row level security;
alter table public.season_rankings enable row level security;
revoke all on public.seasons from anon, authenticated;
revoke all on public.season_rankings from anon, authenticated;
-- คอลัมน์ใหม่บนตารางเดิม: ย้ำ revoke (ตารางเดิมถูก revoke แล้ว แต่กันหลุด).
revoke all on public.users from anon, authenticated;
revoke all on public.healthy_journey from anon, authenticated;
