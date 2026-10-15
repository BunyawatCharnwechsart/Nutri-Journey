-- ============================================================================
-- 0042_betatester_banner.sql
--
-- Banner "betatester" — ของพื้นฐานที่ user ทุกคนมี (ไม่ได้มาจากอันดับ season).
--
-- Changes:
--   1. ขยาย users.active_banner CHECK ให้รับ 'betatester' เพิ่ม
--      (ของเดิมมีแค่ gold/silver/bronze/null).
--   2. สวม betatester ให้ทุกคนที่ยังไม่สวมอะไร (active_banner IS NULL)
--      — user เห็น banner หลังชื่อทันทีโดยไม่ต้องกดเอง.
--
-- หมายเหตุ: ownership ของ betatester ไม่เก็บใน season_rankings (ตารางนั้น
-- เก็บเฉพาะรางวัลอันดับ season) — โค้ดถือว่าทุกคนเป็นเจ้าของ betatester
-- อยู่แล้ว (ดู lib/banner-service.ts) เลยไม่ต้อง insert แถวรายคน.
--
-- Security: ไม่แตะ grants (ตารางเดิมถูก revoke แล้ว).
-- Idempotent: รันซ้ำได้ (UPDATE ซ้ำก็ได้ค่าเดิม).
-- ============================================================================

-- ขยาย CHECK: ลบของเก่า (ถ้ามี) แล้วสร้างใหม่แบบรวม betatester.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'users_active_banner_check'
  ) then
    alter table public.users drop constraint users_active_banner_check;
  end if;

  alter table public.users
    add constraint users_active_banner_check
    check (active_banner is null or active_banner in ('gold', 'silver', 'bronze', 'betatester'));
end
$$;

-- สวม betatester ให้ทุกคนที่ยังว่าง — คนที่สวม gold/silver/bronze อยู่แล้วไม่แตะ.
update public.users
set active_banner = 'betatester'
where active_banner is null;
