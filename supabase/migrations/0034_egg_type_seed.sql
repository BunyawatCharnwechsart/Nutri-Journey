-- ============================================================================
-- 0034_egg_type_seed.sql
-- Seed ชนิดไข่เริ่มต้น: starter (ออกง่าย, weight 7) + pink (หายากกว่า,
-- weight 3). เพิ่มชนิดใหม่ทีหลังแค่ insert แถว — โค้ดสุ่มถ่วงน้ำหนักให้เอง.
-- `mystery` (จาก 0033) คงไว้เป็น fallback สำหรับแถวเก่า.
--
-- Idempotent: insert on conflict do nothing (รันซ้ำไม่เบิ้ล).
-- ============================================================================

insert into public.egg_types (code, name, rarity_weight)
values
  ('starter', 'ไข่เริ่มต้น', 7),
  ('pink', 'ไข่ชมพู', 3)
on conflict (code) do nothing;
