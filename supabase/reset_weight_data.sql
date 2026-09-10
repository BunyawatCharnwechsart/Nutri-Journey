-- ============================================================================
-- reset_weight_data.sql  <-- DESTRUCTIVE — RUN MANUALLY ONLY
-- ============================================================================
--
-- วางแผนลบข้อมูลเก่า + เริ่มใหม่ตาม logic รายเดือน (เดือนละ 1 ครั้ง ICT):
--   * DELETE ALL rows from weight_logs
--   * DELETE ALL rows from measurement_logs
--
-- เหตุผล: เปลี่ยนการบันทึกจาก "ทุก 7/14 วัน" เป็น "เดือนละ 1 ครั้ง" แล้ว
-- ข้อมูลประวัติเดิมที่บันทึกด้วยความถี่เก่าจะไม่สอดคล้อง ให้เริ่ม slate ใหม่
-- ทุกคน (weight_logs กับ measurement_logs ถูกกวาดล้างหมด)
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) IRREVERSIBLE — ไม่มี UNDO. กรุณา backup ก่อน:
--        * Supabase Dashboard → Database → Backups → Enable backups
--        * หรือ export ตารางก่อนลบ (CSV/SQL dump)
--   2) รันใน Supabase SQL Editor ด้วยมือเท่านั้น (privileged connection).
--      อย่าใส่ไฟล์นี้ใน supabase/migrations/ — ห้ามให้ deploy อัตโนมัติแตะ
--      ข้อมูลผู้ใช้จริงโดยไม่ตั้งใจ (migration พลาดรันซ้ำ = user data หาย)
--   3) ตารางอื่น (users, profiles, if_sessions, progress_photos, ...) ไม่ถูกแตะ
--   4) RLS/collumn schema ไม่เปลี่ยน — แค่ลบ data
--   5) หลังลบ: user ทุกคนกลับเป็น "ไม่มีประวัติ" → บันทึกน้ำหนัก/สัดส่วนได้ทันที
--      (gate ใหม่ allow null anchor) แล้ว monthly reminder วันที่ 1 เดือนหน้า
--      จะเตือนอัปเดตตามปกติ
--
-- Idempotent: รันซ้ำได้ (ตารางว่างแล้ว = ไม่ error) แต่ไม่ควรต้องรันซ้ำ.
-- ============================================================================

truncate table public.weight_logs;
truncate table public.measurement_logs;

-- ตรวจผลหลังรัน (ควรได้ 0 ทั้งคู่)
select 'weight_logs' as table_name, count(*) as rows_left from public.weight_logs
union all
select 'measurement_logs', count(*) from public.measurement_logs;