-- ============================================================================
-- 0039_retire_mystery_starter.sql
-- ปลดระวางไข่ลึกลับ + ไข่สีครีม: weight = 0 สุ่มไม่ได้อีก (ของที่อยู่ในตู้
-- และ EXP เดิมอยู่ครบ ไม่แตะ). อยากเอากลับแค่แก้ weight กลับเป็น 1.
--
-- Idempotent: update ตรง code (รันซ้ำได้ ค่าเท่าเดิม).
-- ============================================================================

-- 0033 สร้าง check rarity_weight >= 1 ไว้ — weight 0 (ปลดระวาง) ต้องผ่อน
-- constraint ก่อน ไม่งั้น update ข้างล่างโดนตีกลับ (เคยทำ CD แดงมาแล้ว).
alter table public.egg_types
  drop constraint if exists egg_types_rarity_weight_check;
alter table public.egg_types
  add constraint egg_types_rarity_weight_check check (rarity_weight >= 0);

update public.egg_types
set rarity_weight = 0
where code in ('mystery', 'starter');
