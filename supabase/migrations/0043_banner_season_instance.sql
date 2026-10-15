-- ============================================================================
-- 0043_banner_season_instance.sql
--
-- สวม Banner เจาะจงทีละสมัย (เช่น แชมป์ของ 2026-Q4 โดยเฉพาะ) เพื่อให้ป้าย
-- โชว์ได้ว่า "อันดับ 1 Season 2026-Q4".
--
-- Changes:
--   1. users.active_banner_season_id uuid NULL → FK season_rankings(id)
--      ON DELETE SET NULL (แถว snapshot ถูกลบ ป้ายหลุดแต่ type ไม่หาย).
--   2. กติกา (บังคับฝั่งโค้ด ไม่ใช่ CHECK — CHECK ข้ามตารางไม่ได้):
--        * สวม gold/silver/bronze → season_id ต้องชี้แถว season_rankings
--          ของตัวเองที่ banner ตรงกับ type ที่สวม.
--        * สวม betatester / ถอด (null) → season_id ต้องเป็น NULL.
--   3. backfill: คนที่สวม gold/silver/bronze อยู่ → ชี้แถวล่าสุดของ banner
--      นั้น (ORDER BY created_at DESC LIMIT 1). betatester/ว่างไม่แตะ.
--
-- Security: ไม่แตะ grants (users ถูก revoke แล้ว) — service role เท่านั้น.
-- Idempotent: รันซ้ำได้ (ADD COLUMN IF NOT EXISTS + backfill แบบ WHERE).
-- ============================================================================

alter table public.users
  add column if not exists active_banner_season_id uuid;

-- FK: มีแล้วข้าม (กันรันซ้ำพัง) — ใช้ DO block เช็ค pg_constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_active_banner_season_fk'
  ) then
    alter table public.users
      add constraint users_active_banner_season_fk
      foreign key (active_banner_season_id)
      references public.season_rankings (id)
      on delete set null;
  end if;
end
$$;

create index if not exists users_active_banner_season_idx
  on public.users (active_banner_season_id)
  where active_banner_season_id is not null;

-- backfill เฉพาะคนสวมป้าย season ที่ยังไม่ชี้แถว (แถวล่าสุดของ banner นั้น).
update public.users u
set active_banner_season_id = latest.id
from (
  select distinct on (sr.user_id, sr.banner) sr.user_id, sr.banner, sr.id
  from public.season_rankings sr
  where sr.banner in ('gold', 'silver', 'bronze')
  order by sr.user_id, sr.banner, sr.created_at desc
) as latest
where u.active_banner in ('gold', 'silver', 'bronze')
  and u.active_banner_season_id is null
  and latest.user_id = u.user_id
  and latest.banner = u.active_banner;

-- กันหลุด: betatester/ว่างต้องไม่มี season_id ค้าง (เผื่อข้อมูลเพี้ยน).
update public.users
set active_banner_season_id = null
where (active_banner is null or active_banner = 'betatester')
  and active_banner_season_id is not null;
