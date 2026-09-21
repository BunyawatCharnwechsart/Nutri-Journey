-- ============================================================================
-- seed_if_sessions.sql  <-- DEV MOCK — RUN MANUALLY ONLY
-- ============================================================================
--
-- เพิ่ม mock ประวัติการทำ IF (if_sessions) ให้ user "Bunyawat" ครอบคลุม
-- ม.ค. 2026 → ก.ย. 2026 (9 เดือน, 273 วัน) เพื่อให้หน้า ปฏิทิน / Success card /
-- กราฟอารมณ์ ใน Dashboard โชว์ข้อมูลครบเหมือนใช้งานจริง.
--
-- วิธีทำงาน: ลบ if_sessions ที่มีของ Bunyawat ทั้งหมดก่อน (ขอบเขตเฉพาะ user
-- นี้เท่านั้น — ไม่ truncate ทั้งตาราง) แล้ว insert ชุดใหม่. ค่า pseudo-random
-- สร้างจาก md5 ของวัน (deterministic) → รันซ้ำได้ผลชุดเดิม.
--
-- Mock mix ต่อเดือน:
--   * ทำ IF ประมาณ 70% ของวัน (~21 วัน/เดือน) — pattern 16:8 เด่น, 14:10, 18:6
--   * completed ส่วนใหญ่ + result = 'success' (~75-80%), ที่เหลือ 'fail'
--   * abandoned ประมาณ 4 จุดทั้ง 9 เดือน (result = mood = null)
--   * active = 0 ตัว (กันชนกับ partial unique index if_sessions_one_active_per_user)
--   * mood ครบทั้ง 5 ค่า (เฉลี่ยงไปทางบวก) + สุ่ม 5% เป็น null (ทดสอบ cell ไม่มีอารมณ์)
--   * เวลาคำนวณให้สอดคล้อง: fasting → eating ต่อกัน + duration เท่ากับผลต่างจริง
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) ลบข้อมูล if_sessions ของ Bunyawat ทิ้ง — ไม่มี UNDO (เฉพาะ user นี้).
--   2) รันด้วยมือเท่านั้น (Supabase SQL Editor หรือ scripts/run-seed-if-sessions.mjs) —
--      อย่าใส่ใน supabase/migrations/ และห้ามให้ deploy อัตโนมัติแตะ.
--   3) user อื่น / ตารางอื่นไม่ถูกแตะ.
-- ============================================================================

do $$
declare
  bunyawat_user_id uuid;
  i                int;
  d                date;
  r_skip           numeric;  -- 0/1: วันนี้ทำ IF ไหม
  r_pat            numeric;  -- เลือก pattern
  r_fast           numeric;  -- deviation ของ fasting duration
  r_eat            numeric;  -- deviation ของ eating duration
  r_mood           numeric;  -- เลือก mood
  r_mood_null      numeric;  -- 5% ไม่บันทึกอารมณ์
  pattern          text;
  planned_fast     int;
  planned_eat      int;
  fast_actual      int;
  eat_actual       int;
  s_status         text;
  s_result         text := null;
  s_mood           text := null;
  fstart           timestamptz;
  fend             timestamptz;
  estart           timestamptz;
  eend             timestamptz;
  -- hash calcs
  h_skip      text;
  h_pat       text;
  h_fast      text;
  h_eat       text;
  h_mood      text;
  h_mood_null text;
begin
  -- หา user Bunyawat จาก display_name (แบบเดียวกับ seed_mock_data.sql) + fallback.
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

  -- ล้างของเก่าของ Bunyawat เท่านั้น (ไม่แตะ user อื่น)
  delete from public.if_sessions where user_id = bunyawat_user_id;

  -- ม.ค. 1 (i=0) → ก.ย. 30 (i=272) = 273 วัน. LCG ปนกันหลายตัวคูณ เพื่อให้
  -- pseudo-random แต่ deterministic (รันซ้ำได้ชุดเดิม).
  for i in 0..272 loop
    d := date '2026-01-01' + i;

    -- ค่า pseudo-random ใน [0,1) แบบ deterministic จาก md5 ของวัน (คนละวัน
    -- คนละ seed) → uniform จริง + รันซ้ำได้ชุดเดิม. `substr(h,1,8)` = 8 ตัว
    -- hex แรก (32 bit) แล้วหารด้วย 2^32.
    h_skip      := substr(md5('skip|'  || d::text), 1, 8);
    h_pat       := substr(md5('pat|'   || d::text), 1, 8);
    h_fast      := substr(md5('fast|'  || d::text), 1, 8);
    h_eat       := substr(md5('eat|'   || d::text), 1, 8);
    h_mood      := substr(md5('mood|'  || d::text), 1, 8);
    h_mood_null := substr(md5('mnull|' || d::text), 1, 8);

    r_skip      := ('x' || h_skip)::bit(32)::bigint::numeric      / 4294967296.0;
    r_pat       := ('x' || h_pat)::bit(32)::bigint::numeric       / 4294967296.0;
    r_fast      := ('x' || h_fast)::bit(32)::bigint::numeric      / 4294967296.0;
    r_eat       := ('x' || h_eat)::bit(32)::bigint::numeric       / 4294967296.0;
    r_mood      := ('x' || h_mood)::bit(32)::bigint::numeric      / 4294967296.0;
    r_mood_null := ('x' || h_mood_null)::bit(32)::bigint::numeric / 4294967296.0;

    -- ~30% ของวันไม่ทำ IF (พัก) → ไม่มี session
    if r_skip < 0.30 then
      continue;
    end if;

    -- เลือก pattern: 16:8 (60%), 14:10 (25%), 18:6 (15%)
    if r_pat < 0.60 then
      pattern := '16:8';  planned_fast :=  960;  planned_eat := 480;
    elsif r_pat < 0.85 then
      pattern := '14:10'; planned_fast :=  840;  planned_eat := 600;
    else
      pattern := '18:6';  planned_fast := 1080;  planned_eat := 360;
    end if;

    -- ~4 จุดทั่วทั้ง 9 เดือน: session ที่ถูกทิ้ง (เริ่มใหม่โดยไม่จบ) → abandoned
    if (i - 5) % 63 = 0 then
      fstart := (d + time '20:00') at time zone 'Asia/Bangkok';
      fend   := fstart + (planned_fast * 6 / 10 * interval '1 minute');  -- อดจริง ~60% ของเป้า
      insert into public.if_sessions
        (user_id, status, if_pattern,
         fasting_start_time, fasting_end_time, fasting_duration_minutes,
         created_at)
      values
        (bunyawat_user_id, 'abandoned', pattern,
         fstart, fend, planned_fast * 6 / 10,
         fstart);
      continue;
    end if;

    -- แถว completed: คำนวณ duration จริง +- deviation → นับ success เอง
    fast_actual := planned_fast + round((r_fast - 0.12) * 160)::int;  -- ช่วง [-19, +141]
    eat_actual  := planned_eat  + round((r_eat  - 0.15) * 140)::int;  -- ช่วง [-21, +119]
    fast_actual := greatest(fast_actual, 120);
    eat_actual  := greatest(eat_actual, 120);

    s_result := case
      when fast_actual >= planned_fast and eat_actual >= planned_eat then 'success'
      else 'fail'
    end;

    -- ~5% ไม่บันทึกอารมณ์ (ทดสอบ cell ไม่มี emoji); ที่เหลือแจกทั้ง 5 ค่า
    if r_mood_null >= 0.05 then
      if r_mood < 0.10 then
        s_mood := 'Very bad';
      elsif r_mood < 0.25 then
        s_mood := 'Bad';
      elsif r_mood < 0.45 then
        s_mood := 'Medium';
      elsif r_mood < 0.75 then
        s_mood := 'Good';
      else
        s_mood := 'Very good';
      end if;
    end if;

    -- ลำดับเวลา: fasting เริ่ม 20:00 น. ของวันนั้น → อดจริง fast_actual นาที
    -- → กินต่อจากจุดจบอดทันที eating_actual นาที (ตรง flow ของ app)
    fstart := (d + time '20:00') at time zone 'Asia/Bangkok';
    fend   := fstart + (fast_actual * interval '1 minute');
    estart := fend;
    eend   := estart + (eat_actual * interval '1 minute');

    insert into public.if_sessions
      (user_id, status, if_pattern, mood, result,
       fasting_start_time, fasting_end_time, fasting_duration_minutes,
       eating_start_time, eating_end_time, eating_duration_minutes,
       created_at)
    values
      (bunyawat_user_id, 'completed', pattern, s_mood, s_result,
       fstart, fend, fast_actual,
       estart, eend, eat_actual,
       fstart);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- ตรวจผลหลังรัน (เฉพาะ Bunyawat) — runner print แต่ละแถวนี้
-- ----------------------------------------------------------------------------
with target as (
  select u.user_id from public.users u where u.display_name ilike 'bunyawat' limit 1
)
select 'total sessions' as table_name, count(*)::int as rows_now
  from public.if_sessions where user_id = (select user_id from target)
union all
select 'completed' , count(*)::int from public.if_sessions where user_id = (select user_id from target) and status = 'completed'
union all
select 'abandoned' , count(*)::int from public.if_sessions where user_id = (select user_id from target) and status = 'abandoned'
union all
select 'active'    , count(*)::int from public.if_sessions where user_id = (select user_id from target) and status = 'active'
union all
select 'success'   , count(*)::int from public.if_sessions where user_id = (select user_id from target) and result = 'success'
union all
select 'fail'      , count(*)::int from public.if_sessions where user_id = (select user_id from target) and result = 'fail'
union all
select 'mood non-null', count(*)::int from public.if_sessions where user_id = (select user_id from target) and mood is not null;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) — publishable/anon key ต้องแตะไม่ได้
-- ----------------------------------------------------------------------------
alter table public.if_sessions enable row level security;
revoke all on public.if_sessions from anon, authenticated;