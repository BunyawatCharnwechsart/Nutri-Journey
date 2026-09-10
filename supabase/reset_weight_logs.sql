-- ============================================================================
-- reset_weight_logs.sql  <-- DESTRUCTIVE — RUN MANUALLY ONLY
-- ============================================================================
--
-- ลบข้อมูลน้ำหนัก MOCK ทั้งหมด (weight_logs สำหรับทุก user) เพื่อเริ่มต้นใหม่
-- ด้วย monthly gate (เดือนละ 1 ครั้ง ICT). สัดส่วน (measurement_logs) ไม่ถูกแตะ.
--
-- ⚠️⚠️⚠️  SECURITY / SAFETY  ⚠️⚠️⚠️
--   1) IRREVERSIBLE — ไม่มี UNDO. ตรวจก่อนรันว่า DB เป็น dev/test เท่านั้น.
--   2) รันด้วยมือ (Supabase SQL Editor หรือ scripts/run-reset-weight-logs.mjs).
--      อย่าใส่ใน supabase/migrations/ — ห้ามให้ deploy อัตโนมัติแตะ.
--   3) ตารางอื่น (users, profiles, measurement_logs, ...) ไม่ถูกแตะ.
--   4) หลังลบ: ทุกคนกลับเป็น "ไม่มีประวัติ" → บันทึกน้ำหนักได้ทันที (allow null anchor).
--
-- Idempotent: รันซ้ำได้.
-- ============================================================================

truncate table public.weight_logs;

-- ตรวจผลหลังรัน (ควรได้ 0)
select 'weight_logs' as table_name, count(*) as rows_now from public.weight_logs;