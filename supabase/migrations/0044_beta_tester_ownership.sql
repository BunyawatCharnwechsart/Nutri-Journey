-- ============================================================================
-- 0044_beta_tester_ownership.sql
--
-- ป้าย "betatester" ต้องเป็นของผู้ร่วมทดสอบ Beta เท่านั้น — เดิม 0042 ถือว่า
-- user ทุกคนเป็นเจ้าของ (สวมได้ทุกคน ไม่มีแหล่งความจริงว่าใครเป็น beta).
--
-- Changes:
--   1. users.is_beta_tester boolean not null default false — ธงรายคน.
--   2. backfill: user ที่มีอยู่ก่อน cutoff (สิ้นวัน 16 ต.ค. 2026 เวลาไทย)
--      = true. ใช้ cutoff ตายตัว (ไม่ใช่ now()) — รันซ้ำ (run all migrations)
--      จะไม่เผลอ flag คนที่สมัครใหม่ในอนาคต.
--   3. กันหลุด: คนที่ไม่ใช่ beta แต่ active_banner = 'betatester' → ถอดป้าย
--      (active_banner_season_id เป็น null อยู่แล้วตาม 0043).
--   4. re-assert revoke — users ถูก revoke อยู่แล้ว แต่ย้ำกัน grant หลุด.
--
-- หมายเหตุ: ownership betatester ยังไม่เก็บใน season_rankings (ตารางนั้น
-- เก็บเฉพาะรางวัลอันดับ season) — โค้ดเช็ค users.is_beta_tester ฝั่ง server
-- ทุกครั้งที่สวม/นับ ownership (ดู lib/banner-service.ts).
--
-- Security: ไม่มี grant ใหม่ — service role เท่านั้น (RLS เปิดอยู่).
-- Idempotent: รันซ้ำได้ (ADD COLUMN IF NOT EXISTS + UPDATE แบบ WHERE).
-- ============================================================================

alter table public.users
  add column if not exists is_beta_tester boolean not null default false;

-- Backfill ผู้ใช้ทุกคนที่มีอยู่ตอนนี้ = ผู้ร่วมทดสอบ Beta.
update public.users
set is_beta_tester = true
where created_at < timestamptz '2026-10-17 00:00:00+07';

-- กันหลุด: ป้าย betatester ต้องอยู่กับ beta เท่านั้น (ถ้าถูก unflag ทีหลัง).
update public.users
set active_banner = null
where active_banner = 'betatester'
  and is_beta_tester = false;

revoke all on public.users from anon, authenticated;
