-- ============================================================================
-- seed_mock_weight.sql  <-- DEV MOCK — RUN MANUALLY ONLY
-- ============================================================================
--
-- Mock series น้ำหนัก+สัดส่วนของ user "Bunyawat": วันที่ 1 ของทุกเดือน
-- ม.ค. 2026 → ก.ย. 2026 (9 จุด, เดือนปัจจุบัน) — ตรงกับ monthly gate และ
-- สอดคล้องกับ mock if_sessions (seed_if_sessions.sql) ที่มีให้แล้ว.
--
-- น้ำหนักค่อยๆ ลด 91.5 → 88 กก. (จบตรงกับค่าน้ำหนักจริงที่เคยบันทึก 88 กก.);
-- สัดส่วน (นิ้ว) waist 40.5 → 39, hip 39.5 → 38, chest 37 → 36.
--
-- ขอบเขต (ต่างจาก seed_mock_data.sql): ลบเฉพาะ weight_logs/measurement_logs
-- ของ Bunyawat เท่านั้น — ผู้ใช้อื่นและตารางอื่นไม่ถูกแตะ — แล้ว insert
-- ชุดใหม่พร้อม upsert keyed (user_id, recorded_on) → รันซ้ำได้.
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) ลบประวัติน้ำหนักของ Bunyawat ทิ้ง — ไม่มี UNDO (เฉพาะ user นี้).
--   2) รันด้วยมือเท่านั้น (Supabase SQL Editor หรือ scripts/run-seed-mock-weight.mjs) —
--      อย่าใส่ใน supabase/migrations/ และห้ามให้ deploy อัตโนมัติแตะ.
-- ============================================================================

do $$
declare
  bunyawat_user_id uuid;
  i                int;
  d                date;
  row_ts           timestamptz;
begin
  -- หา user Bunyawat จาก display_name (แบบเดียวกับ seed ตัวอื่น) + UUID fallback.
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

  -- ล้างเฉพาะของเก่าของ Bunyawat (ผู้ใช้อื่นไม่ถูกแตะ)
  delete from public.weight_logs      where user_id = bunyawat_user_id;
  delete from public.measurement_logs where user_id = bunyawat_user_id;

  -- ม.ค. 1 (i=0) → ก.ย. 1 (i=8)
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
-- ตรวจผลหลังรัน (เฉพาะ Bunyawat) — คาด: weight_logs = 9, measurement_logs = 9
-- ----------------------------------------------------------------------------
with target as (
  select u.user_id from public.users u where u.display_name ilike 'bunyawat' limit 1
)
select 'weight_logs' as table_name, count(*)::int as rows_now
  from public.weight_logs where user_id = (select user_id from target)
union all
select 'measurement_logs', count(*)::int
  from public.measurement_logs where user_id = (select user_id from target);

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) — publishable/anon key ต้องแตะไม่ได้
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;
alter table public.measurement_logs enable row level security;
revoke all on public.measurement_logs from anon, authenticated;