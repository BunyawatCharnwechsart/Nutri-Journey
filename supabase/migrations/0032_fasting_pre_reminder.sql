-- ============================================================================
-- 0032_fasting_pre_reminder.sql
-- Pre-reminder 1 ชั่วโมงก่อนหมดเวลาอด (fasting) — ส่งครั้งเดียว ไม่เตือนซ้ำ.
--
-- Adds:
--   1. if_sessions.fasting_pre_notified_at — เวลาที่ส่ง push "อีก 1 ชม.จะครบ"
--      สำเร็จครั้งล่าสุด (null = ยังไม่เคยส่ง). cron อัปเดตเฉพาะหลังส่งสำเร็จ
--      เหมือน fasting/eating_end_notified_at (0011) — ส่งพลาดรอบนี้ รอบหน้า
--      cron จะลองใหม่เอง.
--
-- เงื่อนไขฝั่งโค้ด (lib/if-notifications.ts):
--   * ส่งเมื่อ now อยู่ใน [fastingEnd - 1h, fastingEnd) และยังไม่กดหยุดอด
--   * ฟาสติ้งสั้นกว่า 1 ชม. (จุดเตือนอยู่ก่อนเวลาเริ่ม) → ข้าม ไม่ส่ง
--   * ถ้าเลยเวลาอดไปแล้ว ให้เตือน "อดครบ" รับช่วงแทน (ไม่ส่งเตือนล่วงหน้าย้อนหลัง)
--
-- Every statement is idempotent so node scripts/run-migration.mjs (or the
-- Supabase SQL editor) can run it repeatedly.
-- ============================================================================

alter table public.if_sessions
  add column if not exists fasting_pre_notified_at timestamptz;
