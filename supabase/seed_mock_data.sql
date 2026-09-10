-- ============================================================================
-- seed_mock_data.sql  <-- DESTRUCTIVE + DEV MOCK — RUN MANUALLY ONLY
-- ============================================================================
--
-- ลบข้อมูลน้ำหนัก/สัดส่วนของทุกคน แล้วแทนที่ด้วย mock series ใหม่ของ
-- user "Bunyawat" เท่านั้น.
--
-- Mock series: วันที่ 1 ของทุกเดือน ตั้งแต่ ม.ค. 2026 → ก.ย. 2026 (เดือน
-- ปัจจุบัน, 9 จุด) ทั้ง weight_logs และ measurement_logs — บันทึก 1st ของเดือน
-- ให้ตรงกับ monthly gate. น้ำหนักค่อยๆ ลด 91.5 → 88 กก.; สัดส่วน (นิ้ว)
-- waist 40.5 → 39, hip 39.5 → 38, chest 37 → 36 (ลงจบพอดีกับค่าจริงที่เคย
-- บันทึก ก.ย. 26 = waist 39). จุดล่าสุด = 1 ก.ย. 2026 → gate เดือน ก.ย.
-- ปิด (บันทึกแล้ว) เหมาะกับการ test หน้า calendar/photo card.
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) TRUNCATE = ลบประวัติผู้ใช้จริงทุกคน — ไม่มี UNDO. Backup ก่อนถ้าไม่ใช่
--      DB dev (Dashboard → Backups / SQL dump).
--   2) รันด้วยมือเท่านั้น (Supabase SQL Editor หรือ scripts/run-seed-mock.mjs) —
--      อย่าใส่ใน supabase/migrations/ และห้ามให้ deploy อัตโนมัติแตะ.
--   3) เขียนเฉพาะ 2 ตาราง (weight_logs, measurement_logs) — users/profiles/etc.
--      ไม่ถูกแตะ.
--   4) Idempotent สำหรับส่วน seed: upsert keyed (user_id, recorded_on). แต่
--      ส่วน truncate ไม่ idempotent ในแง่ข้อมูล (ลบซ้ำได้แต่ไม่ควร).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — ล้างข้อมูลเก่าทั้งหมด (ทุก user)
-- ----------------------------------------------------------------------------
truncate table public.weight_logs;
truncate table public.measurement_logs;

-- ----------------------------------------------------------------------------
-- Part 2 — seed mock ใหม่ให้ Bunyawat (วันที่ 1 ของทุกเดือน, ม.ค.–ก.ย. 2026)
-- ----------------------------------------------------------------------------
do $$
declare
  bunyawat_user_id uuid;
  i                int;
  d                date;
  row_ts           timestamptz;
begin
  -- หา user Bunyawat จาก display_name (แบบเดียวกับ 0021) + UUID fallback.
  select u.user_id into bunyawat_user_id
    from public.users u
   where u.display_name ilike 'bunyawat'
   limit 1;

  if bunyawat_user_id is null then
    bunyawat_user_id := '9f2a33e3-0009-4f99-be6a-6eacfa36536e'::uuid;
  end if;

  if not exists (select 1 from public.users where user_id = bunyawat_user_id) then
    raise exception 'Bunyawat user not found in public.users';
  end if;

  for i in 0..8 loop
    d := (date '2026-01-01' + (i * interval '1 month'))::date;
    row_ts := (d + time '12:00') at time zone 'Asia/Bangkok';

    insert into public.weight_logs (user_id, recorded_on, weight_kg, logged_at, updated_at)
    values (
      bunyawat_user_id,
      d,
      round((91.5 - 3.5 * i::numeric / 8.0)::numeric, 1),
      row_ts,
      row_ts
    )
    on conflict (user_id, recorded_on) do update
      set weight_kg = excluded.weight_kg,
          updated_at = excluded.updated_at;

    insert into public.measurement_logs (user_id, recorded_on, waist_in, hip_in, chest_in, updated_at)
    values (
      bunyawat_user_id,
      d,
      round((40.5 - 1.5 * i::numeric / 8.0)::numeric, 1),
      round((39.5 - 1.5 * i::numeric / 8.0)::numeric, 1),
      round((37.0 - 1.0 * i::numeric / 8.0)::numeric, 1),
      row_ts
    )
    on conflict (user_id, recorded_on) do update
      set waist_in = excluded.waist_in,
          hip_in = excluded.hip_in,
          chest_in = excluded.chest_in,
          updated_at = excluded.updated_at;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- ตรวจผลหลังรัน (คาด: weight_logs = 9, measurement_logs = 9)
-- ----------------------------------------------------------------------------
select 'weight_logs' as table_name, count(*) as rows_now from public.weight_logs
union all
select 'measurement_logs', count(*) from public.measurement_logs;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) — publishable/anon key ต้องแตะไม่ได้
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;
alter table public.measurement_logs enable row level security;
revoke all on public.measurement_logs from anon, authenticated;