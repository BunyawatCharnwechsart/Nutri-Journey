-- ============================================================================
-- scheduled_season_reset.sql
--
-- NOTE: ไฟล์นี้นอก supabase/migrations/ — ไม่ใช่ schema migration
-- (scripts/run-migration.mjs สแกนแค่ migrations/) รันมือครั้งเดียวใน
-- Supabase SQL editor (หรือ node scripts/run-migration.mjs
-- --file=scheduled_season_reset แล้วแทน placeholder ตามข้างล่าง).
--
-- ทำอะไร: สั่ง pg_cron ยิง POST /api/cron/season-reset ทุกวันที่ 1
-- ม.ค./เม.ย./ก.ค./ต.ค. เวลา 00:05 ICT (= 17:05 UTC วันก่อนหน้า).
-- endpoint เองเป็น idempotent: ถ้า quarter ยังไม่เปลี่ยนจะแค่ upsert
-- season ปัจจุบันเป็น active แล้วจบ — ยิงซ้ำไม่เบิ้ล snapshot.
--
-- SECURITY:
--   * แทน :CRON_SECRET ด้วยค่าจริง (ตรงกับ CRON_SECRET บน Vercel) ก่อนรัน
--     ห้าม commit ค่าจริง.
--
-- Idempotent — รันซ้ำได้ (unschedule ชื่องานเดิมก่อนเสมอ).
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid)
from cron.job
where jobname in ('season-reset');

-- 5 17 31 3,12 * = 17:05 UTC วันที่ 31 มี.ค./31 ธ.ค.
-- 5 17 30 6,9 *  = 17:05 UTC วันที่ 30 มิ.ย./30 ก.ย.
-- ทั้งคู่ = 00:05 ICT วันที่ 1 ของ quarter ถัดไป (เม.ย./ก.ค./ต.ค./ม.ค.).
select cron.schedule(
  'season-reset-q3-q4',
  '5 17 30 6,9 *',
  $$
  select net.http_post(
    url := 'https://www.nutrijourney88.com/api/cron/season-reset',
    headers := jsonb_build_object(
      'Authorization', 'Bearer :CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);

select cron.schedule(
  'season-reset-q1-q2',
  '5 17 31 3,12 *',
  $$
  select net.http_post(
    url := 'https://www.nutrijourney88.com/api/cron/season-reset',
    headers := jsonb_build_object(
      'Authorization', 'Bearer :CRON_SECRET',
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);
