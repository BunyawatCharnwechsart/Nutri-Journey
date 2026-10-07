-- ============================================================================
-- 0033_egg_draws.sql
-- ระบบสุ่มไข่: อด success วันปฏิทิน ICT ติดกัน 3 วัน → ได้สิทธิ์สุ่ม 1 ครั้ง
-- (กดรับเอง) → รีเซ็ตนับหน้าต่างใหม่.
--
-- Adds:
--   1. egg_types — catalog ชนิดไข่ (code/name/rarity_weight). เพิ่มชนิดใหม่
--      แค insert แถว ไม่ต้องแก้โค้ด (สุ่มถ่วงน้ำหนักตาม rarity_weight).
--      seed 1 แถว: mystery/ไข่ลึกลับ.
--   2. egg_draws — หน้าต่าง 3 วันที่แจกสิทธิ์แล้ว 1 แถว/หน้าต่าง.
--      claimed_at null = สิทธิ์ค้าง (ยังไม่กดสุ่ม), egg_type ถูกเติมตอนกด.
--      UNIQUE (user_id, cycle_start) กันแจกหน้าต่างเดิมซ้ำ.
--
-- ความต่อเนื่องนับจาก if_sessions.result = 'success' ฝั่งโค้ด
-- (lib/egg-draw.ts) — migration นี้เก็บแค่ผลลัพธ์ ไม่เก็บ streak.
--
-- Security: RLS + revoked grants — service-role server เท่านั้นที่แตะได้
-- (เหมือนทุกตาราง) โค้ดบังคับ user_id จาก requireAuth() เสมอ.
--
-- Every statement is idempotent so node scripts/run-migration.mjs (or the
-- Supabase SQL editor) can run it repeatedly.
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists public.egg_types (
  code           text primary key,
  name           text not null,
  rarity_weight  integer not null default 1 check (rarity_weight >= 1)
);

insert into public.egg_types (code, name, rarity_weight)
values ('mystery', 'ไข่ลึกลับ', 1)
on conflict (code) do nothing;

create table if not exists public.egg_draws (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(user_id) on delete cascade,
  cycle_start date not null,
  cycle_end   date not null,
  granted_at  timestamptz not null default now(),
  claimed_at  timestamptz,
  egg_type    text references public.egg_types(code)
);

-- หนึ่งหน้าต่าง 3 วัน = หนึ่งสิทธิ์ (กันแจกซ้ำที่ DB).
create unique index if not exists egg_draws_user_cycle_key
  on public.egg_draws (user_id, cycle_start);

-- รูปแบบ query หลัก: สิทธิ์ค้าง + ประวัติของ user คนเดียว.
create index if not exists egg_draws_user_claimed_idx
  on public.egg_draws (user_id, claimed_at);

-- ----------------------------------------------------------------------------
-- Security — service-role only, app enforces user_id in code.
-- ----------------------------------------------------------------------------
alter table public.egg_types enable row level security;
revoke all on public.egg_types from anon, authenticated;
alter table public.egg_draws enable row level security;
revoke all on public.egg_draws from anon, authenticated;
