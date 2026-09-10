-- ============================================================================
-- seed_mock_data.sql  <-- DESTRUCTIVE + DEV MOCK — RUN MANUALLY ONLY
-- ============================================================================
--
-- ลบข้อมูลน้ำหนัก/สัดส่วนของทุกคน แล้วแทนที่ด้วย mock series ใหม่ของ
-- user "Bunyawat" เท่านั้น (ตาม req: ลบทั้งหมด + mockup เฉพาะ bunyawat).
--
-- Mock series: เดือนละ 1 จุด (ตรงกับ monthly gate ใหม่) ตั้งแต่ม.ค. 2025 →
-- ส.ค. 2026 (20 จุด, 2 ปี ytd ครอบ Jan 2025 – ส.ค. 2026) ทั้ง weight_logs
-- และ measurement_logs. จุดล่าสุด = ส.ค. 2026 → เดือนนี้ (ก.ย.) ยังบันทึกได้
-- เพื่อ test flow GET/POST ได้ทันที. น้ำหนักค่อยๆ ลด 95 → 88 กก. + wobble
-- เล็กน้อยให้กราฟดูจริง; สัดส่วน (นิ้ว) waist 42→37, hip 41.5→38.5,
-- chest 40.5→39.
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) TRUNCATE = ลบประวัติผู้ใช้จริงทุกคน — ไม่มี UNDO. Backup ก่อนถ้าไม่ใช่
--      DB dev (Dashboard → Backups / SQL dump).
--   2) รันด้วยมือใน Supabase SQL Editor เท่านั้น — อย่าใส่ใน supabase/migrations/
--      และห้ามให้ deploy อัตโนมัติแตะ (พลาดรันซ้ำ = user data หาย + mock ซ้ำ)
--   3) เขียนเฉพาะ 2 ตาราง (weight_logs, measurement_logs) — users/profiles/etc.
--      ไม่ถูกแตะ. profiles ยังเก็บค่า waist/hip/chest ล่าสุดตามเดิม (ไม่อัปเดต
--      กลับจาก mock เพื่อกันรบกวนข้อมูลโปรไฟล์จริง — ผ่าน UI "อัปเดตสัดส่วน"
--      จะ sync เอง)
--   4) Idempotent สำหรับส่วน seed: upsert keyed (user_id, recorded_on). แต่
--      ส่วน truncate ไม่ idempotent ในแง่ข้อมูล (ลบซ้ำได้แต่ไม่ควร)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — ล้างข้อมูลเก่าทั้งหมด (ทุก user)
-- ----------------------------------------------------------------------------
truncate table public.weight_logs;
truncate table public.measurement_logs;

-- ----------------------------------------------------------------------------
-- Part 2 — seed mock ใหม่ให้ Bunyawat (เดือนละ 1 จุด)
-- ----------------------------------------------------------------------------
do $$
declare
  bunyawat_user_id uuid;
  i                int;
  d                date;
  wobble_w         numeric;
  wobble_m         numeric;
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

  for i in 0..19 loop
    d := (date '2025-01-01' + (i * interval '1 month'))::date;
    row_ts := (d + time '12:00') at time zone 'Asia/Bangkok';

    wobble_w := case i % 4
                  when 0 then 0.0
                  when 1 then -0.1
                  when 2 then 0.1
                  else 0.2
                end;
    wobble_m := case i % 4
                  when 0 then 0.0
                  when 1 then -0.2
                  when 2 then 0.1
                  else 0.2
                end;

    insert into public.weight_logs (user_id, recorded_on, weight_kg, logged_at, updated_at)
    values (
      bunyawat_user_id,
      d,
      round((95.0 - 7.0 * i::numeric / 19.0 + wobble_w)::numeric, 1),
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
      round((42.0 - 5.0 * i::numeric / 19.0 + wobble_m)::numeric, 1),
      round((41.5 - 3.0 * i::numeric / 19.0 + wobble_m)::numeric, 1),
      round((40.5 - 1.5 * i::numeric / 19.0 + wobble_m)::numeric, 1),
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
-- ตรวจผลหลังรัน (คาด: weight_logs = 20, measurement_logs = 20)
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