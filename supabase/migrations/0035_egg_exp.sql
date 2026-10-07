-- ============================================================================
-- 0035_egg_exp.sql
-- EXP 2 ชั้น: ไข่แต่ละฟองมี egg_exp ของตัวเอง, user EXP = ผลรวม egg_exp.
--
-- Adds:
--   1. egg_draws.egg_exp — EXP ของไข่ฟองนี้ (default 0).
--   2. egg_draws.is_active — ตัวเลี้ยง (ตัวรับ EXP จากภารกิจ) มีได้ทีละตัว
--      ต่อ user (partial unique index).
--   3. Backfill โอนแต้มเก่า (healthy_journey.total_points) เข้าฟองที่ claim
--      เก่าสุด — ถ้าไม่มีฟองที่ claim เลย สร้าง "ไข่เริ่มต้น" (mystery)
--      รับแต้มไป แล้วเปิด active ให้ฟองเก่าสุดของทุกคนที่ยังไม่มี active.
--
-- หลัง backfill: SUM(egg_exp) = total_points ทุก user; โค้ด (awardMission)
-- บวกทั้งสองฝั่งพร้อมกันทุกครั้ง เลยคง invariant นี้ตลอดไป.
-- Ranking/level อ่าน total_points เหมือนเดิม ไม่ต้องเปลี่ยน.
--
-- Idempotent: add column/index if not exists + เงื่อนไข "เฉพาะแถวที่ยัง
-- ไม่ถูก backfill" (รันซ้ำไม่เบิ้ล).
-- ============================================================================

alter table public.egg_draws
  add column if not exists egg_exp integer not null default 0;
alter table public.egg_draws
  add column if not exists is_active boolean not null default false;

-- ตัวเลี้ยงมีได้ทีละตัวต่อ user.
create unique index if not exists egg_draws_one_active_per_user
  on public.egg_draws (user_id) where is_active;

-- 1) โอนแต้มเก่าเข้าฟองที่ claim เก่าสุด (เฉพาะ user ที่ยังมี SUM(egg_exp)=0).
with oldest as (
  select distinct on (d.user_id) d.id, d.user_id
  from public.egg_draws d
  where d.claimed_at is not null
  order by d.user_id, d.claimed_at asc
),
sums as (
  select d.user_id, coalesce(sum(d.egg_exp), 0) as total
  from public.egg_draws d
  group by d.user_id
)
update public.egg_draws d
set egg_exp = d.egg_exp + j.total_points
from public.healthy_journey j
join oldest o on o.user_id = j.user_id
left join sums s on s.user_id = j.user_id
where o.id = d.id
  and j.total_points > 0
  and coalesce(s.total, 0) = 0;

-- 2) user ที่มีแต้มแต่ไม่มีฟองที่ claim เลย → สร้างไข่เริ่มต้นรับแต้มไป.
insert into public.egg_draws
  (user_id, cycle_start, cycle_end, granted_at, claimed_at, egg_type, egg_exp, is_active)
select
  j.user_id, date '1970-01-01', date '1970-01-01',
  now(), now(), 'mystery', j.total_points, true
from public.healthy_journey j
where j.total_points > 0
  and not exists (
    select 1 from public.egg_draws d
    where d.user_id = j.user_id and d.claimed_at is not null
  )
on conflict (user_id, cycle_start) do nothing;

-- 3) เปิด active ให้ฟองที่ claim เก่าสุด (เฉพาะคนที่ยังไม่มี active).
with oldest as (
  select distinct on (d.user_id) d.id, d.user_id
  from public.egg_draws d
  where d.claimed_at is not null
  order by d.user_id, d.claimed_at asc
)
update public.egg_draws d
set is_active = true
from oldest o
where d.id = o.id
  and not exists (
    select 1 from public.egg_draws a
    where a.user_id = d.user_id and a.is_active
  );
