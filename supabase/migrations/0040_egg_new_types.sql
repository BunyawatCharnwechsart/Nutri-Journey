-- ============================================================================
-- 0040_egg_new_types.sql
-- เพิ่มไข่ 5 ชนิด (green/orange/purple/yellow/rainbow) — rainbow หายากสุด
-- (weight 1) ชนิดอื่นที่สุ่มได้ weight 2 (ชนิดละ ~10.5%, rainbow ~5.3%).
-- ชนิดที่ปลดระวาง (mystery/starter) คง weight 0 เหมือนเดิม.
--
-- Idempotent: insert on conflict do update (รันซ้ำได้ ค่าเท่าเดิม).
-- ============================================================================

insert into public.egg_types (code, name, rarity_weight)
values
  ('green', 'ไข่เขียว', 2),
  ('orange', 'ไข่ส้ม', 2),
  ('purple', 'ไข่ม่วง', 2),
  ('yellow', 'ไข่เหลือง', 2),
  ('rainbow', 'ไข่รุ้ง', 1),
  ('pink', 'ไข่ชมพู', 2),
  ('blue', 'ไข่สีน้ำเงิน', 2),
  ('red', 'ไข่แดง', 2)
on conflict (code) do update
set name = excluded.name,
    rarity_weight = excluded.rarity_weight;
