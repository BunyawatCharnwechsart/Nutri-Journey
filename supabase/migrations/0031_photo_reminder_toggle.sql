-- 0031_photo_reminder_toggle.sql
--
-- แยกการแจ้งเตือน "ถ่ายรูปความคืบหน้า" ออกเป็นข้อความ/สวิทช์อิสระ:
--
--   * 0030 แยก "แจ้งเตือนหมดเวลาอด/กิน" (line_notifications_enabled) กับ
--     "แจ้งเตือนอัปเดตรายเดือน" (monthly_reminder_enabled) ออกจากกัน.
--   * ตัวนี้เพิ่ม monthly_reminder_enabled ตัวที่สอง — users.photo_reminder_enabled —
--     ให้ cron รายเดือน (app/api/cron/monthly-reminder) ส่งข้อความ "ถ่ายรูป" เป็น
--     push แยกได้เมื่อปิด/เปิดเอง ต่างจากเดิมที่บรรทัด 📸 ยัดในข้อความรายเดือน.
--
-- ค่า NULL (= ยังไม่เคยตอบ) ถูกอ่านเป็น "เปิด" (อย่างเดียวกับ 0030) —
-- โค้ดอ่านด้วย `photo_reminder_enabled !== false`. ดังนั้น behavior เดิมไม่เปลี่ยน
-- จนกว่า user จะเลือกปิดเองใน BellButton.
--
-- Idempotent: รันซ้ำได้ (add column if not exists). ไม่แตะ RLS/grant —
-- คอลัมน์ใหม่ใน users (hardened ไปแล้ว) ไม่ต้อง revoke เพิ่มเติม.
-- ============================================================================

alter table public.users
  add column if not exists photo_reminder_enabled boolean;