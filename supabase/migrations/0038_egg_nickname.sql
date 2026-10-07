-- ============================================================================
-- 0038_egg_nickname.sql
-- ชื่อรายฟอง: ย้ายที่เก็บชื่อจาก avatar_name (1 ค่าต่อ user) มาเป็น
-- egg_draws.nickname (1 ค่าต่อฟอง) — เปลี่ยนชื่อมีผลเฉพาะตัว active,
-- ย้ายไปฟองอื่นชื่อเดิมของมันยังอยู่.
--
-- Backfill: ก็อป avatar_name ลง nickname ของฟอง active เฉพาะที่ตั้งจริง
-- (ข้ามค่า default 'ไข่' กับ null — ปล่อย null ให้ fallback โชว์ชื่อชนิด).
-- avatar_name เดิมไม่ลบ (เป็น fallback ให้ user ที่ยังไม่มีไข่เลย).
--
-- Idempotent: add column if not exists + update เฉพาะแถวที่ nickname
-- ยัง null (รันซ้ำไม่เบิ้ล).
-- ============================================================================

alter table public.egg_draws
  add column if not exists nickname text;

update public.egg_draws d
set nickname = j.avatar_name
from public.healthy_journey j
where d.user_id = j.user_id
  and d.is_active
  and d.nickname is null
  and j.avatar_name is not null
  and j.avatar_name <> 'ไข่';
