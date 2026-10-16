-- ============================================================================
-- seed_mock_season_banners.sql  <-- DEV MOCK — RUN MANUALLY ONLY
-- ============================================================================
--
-- Seed ป้ายแชมป์ย้อนหลัง 5 สมัยให้ user เป้าหมาย (ค่าเริ่มต้น: Bunyawat)
-- เพื่อดู UI แบบ "แชมป์หลายสมัยติดกัน" (streak chip "N สมัยติด") + การสวม
-- ป้ายทีละสมัยในหน้า /profile.
--
-- ข้อมูลที่ seed (closed seasons, ICT quarters):
--   2025-Q3  bronze  อันดับ 3  720 pts
--   2025-Q4  gold    อันดับ 1  880 pts  ┐
--   2026-Q1  gold    อันดับ 1  910 pts  ├ streak 3 (แชมป์ติดกัน)
--   2026-Q2  gold    อันดับ 1  940 pts  ┘ ← สวมอยู่ (โชว์ "3 สมัยติด")
--   2026-Q3  silver  อันดับ 2  860 pts  (streak ขาด)
--
-- แล้วตั้ง users.active_banner='gold' ชี้แถว 2026-Q2 ให้เห็นป้าย+streak
-- หลังชื่อทันที + ตั้ง is_beta_tester=true ให้เห็นแถว "ผู้ร่วม Beta" ใน picker.
-- season ปัจจุบัน (2026-Q4) ไม่ถูกแตะ.
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) รันกับ DB dev เท่านั้น — เขียนทับ (upsert) season_rankings ของ user
--      เป้าหมายใน 5 สมัยนี้ + เปลี่ยน active_banner ของ user เป้าหมาย.
--      ไม่ลบข้อมูลตารางอื่น ไม่แตะ user อื่น.
--   2) รันด้วยมือเท่านั้น (Supabase SQL Editor หรือ scripts/run-seed-mock-banners.mjs)
--      — อย่าใส่ใน supabase/migrations/ และห้ามให้ deploy อัตโนมัติแตะ.
--   3) Idempotent: รันซ้ำได้ (upsert by season_key / (season_id, user_id)).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — upsert 5 season ปิดแล้ว (ขอบเขตเวลาเดียวกับ getQuarterBounds:
-- เที่ยงคืน ICT วันแรกของ quarter, เก็บเป็น timestamptz).
-- ----------------------------------------------------------------------------
insert into public.seasons
  (season_key, year, quarter, starts_at, ends_at, status, closed_at)
values
  ('2025-Q3', 2025, 3,
   timestamptz '2025-07-01T00:00:00+07', timestamptz '2025-10-01T00:00:00+07',
   'closed', timestamptz '2025-10-01T00:00:00+07'),
  ('2025-Q4', 2025, 4,
   timestamptz '2025-10-01T00:00:00+07', timestamptz '2026-01-01T00:00:00+07',
   'closed', timestamptz '2026-01-01T00:00:00+07'),
  ('2026-Q1', 2026, 1,
   timestamptz '2026-01-01T00:00:00+07', timestamptz '2026-04-01T00:00:00+07',
   'closed', timestamptz '2026-04-01T00:00:00+07'),
  ('2026-Q2', 2026, 2,
   timestamptz '2026-04-01T00:00:00+07', timestamptz '2026-07-01T00:00:00+07',
   'closed', timestamptz '2026-07-01T00:00:00+07'),
  ('2026-Q3', 2026, 3,
   timestamptz '2026-07-01T00:00:00+07', timestamptz '2026-10-01T00:00:00+07',
   'closed', timestamptz '2026-10-01T00:00:00+07')
on conflict (season_key) do update
  set starts_at = excluded.starts_at,
      ends_at   = excluded.ends_at,
      status    = excluded.status,
      closed_at = excluded.closed_at;

-- ----------------------------------------------------------------------------
-- Part 2 — upsert season_rankings ของ user เป้าหมาย + สวมป้าย 2026-Q2.
-- created_at = วันจบสมัย เพื่อให้ picker เรียงใหม่ → เก่าคงที่.
-- ----------------------------------------------------------------------------
do $$
declare
  mock_user_id uuid;
begin
  -- หา user จาก display_name (แบบเดียวกับ seed_mock_data.sql) + UUID fallback.
  select u.user_id into mock_user_id
    from public.users u
   where u.display_name ilike 'bunyawat'
   limit 1;

  if mock_user_id is null then
    mock_user_id := '9f2a33e3-0009-4f99-be6a-6eacfa36536e'::uuid;
  end if;

  if not exists (select 1 from public.users where user_id = mock_user_id) then
    raise exception 'Mock user not found in public.users (แก้ display_name/uuid ในไฟล์ seed)';
  end if;

  insert into public.season_rankings
    (season_id, user_id, rank, season_points, banner, created_at)
  select s.id, mock_user_id, v.place, v.points, v.banner, v.created_at
    from (values
      ('2025-Q3', 3, 720, 'bronze', timestamptz '2025-10-01T00:00:00+07'),
      ('2025-Q4', 1, 880, 'gold',   timestamptz '2026-01-01T00:00:00+07'),
      ('2026-Q1', 1, 910, 'gold',   timestamptz '2026-04-01T00:00:00+07'),
      ('2026-Q2', 1, 940, 'gold',   timestamptz '2026-07-01T00:00:00+07'),
      ('2026-Q3', 2, 860, 'silver', timestamptz '2026-10-01T00:00:00+07')
    ) as v(season_key, place, points, banner, created_at)
    join public.seasons s on s.season_key = v.season_key
  on conflict (season_id, user_id) do update
    set rank          = excluded.rank,
        season_points = excluded.season_points,
        banner        = excluded.banner,
        created_at    = excluded.created_at;

  -- สวม gold ของ 2026-Q2 (กลาง streak) — ป้ายหลังชื่อโชว์ "3 สมัยติด".
  update public.users
     set active_banner = 'gold',
         active_banner_season_id = (
           select sr.id
             from public.season_rankings sr
             join public.seasons s on s.id = sr.season_id
            where sr.user_id = mock_user_id
              and s.season_key = '2026-Q2'
            limit 1
         )
   where user_id = mock_user_id;

  -- ทำเครื่องหมายเป็นผู้ร่วม Beta — picker โชว์แถว "ผู้ร่วม Beta" ด้วย.
  update public.users
     set is_beta_tester = true
   where user_id = mock_user_id;
end $$;

-- ----------------------------------------------------------------------------
-- ตรวจผลหลังรัน (คาด: 5 แถวของ user เป้าหมาย — gold 3 / silver 1 / bronze 1)
-- ----------------------------------------------------------------------------
select u.display_name, u.is_beta_tester, s.season_key, sr.banner, sr.rank, sr.season_points
  from public.season_rankings sr
  join public.seasons s on s.id = sr.season_id
  join public.users u on u.user_id = sr.user_id
 where s.season_key in ('2025-Q3', '2025-Q4', '2026-Q1', '2026-Q2', '2026-Q3')
 order by s.starts_at;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) — anon/authenticated ต้องแตะไม่ได้
-- ----------------------------------------------------------------------------
alter table public.seasons enable row level security;
alter table public.season_rankings enable row level security;
revoke all on public.seasons from anon, authenticated;
revoke all on public.season_rankings from anon, authenticated;
revoke all on public.users from anon, authenticated;
