-- ============================================================================
-- 0036_egg_equal_weights.sql
-- ไข่ทุกชนิดโอกาสออกเท่ากัน (rarity_weight = 1 หมด) + เพิ่ม blue/red.
-- สุ่ม 5 ชนิด → ชนิดละ 20%.
--
-- Idempotent: insert on conflict do update (รันซ้ำได้ ค่าเท่าเดิม).
-- ============================================================================

insert into public.egg_types (code, name, rarity_weight)
values
  ('starter', 'ไข่เริ่มต้น', 1),
  ('pink', 'ไข่ชมพู', 1),
  ('blue', 'ไข่สีน้ำเงิน', 1),
  ('red', 'ไข่แดง', 1),
  ('mystery', 'ไข่ลึกลับ', 1)
on conflict (code) do update
set name = excluded.name,
    rarity_weight = excluded.rarity_weight;
