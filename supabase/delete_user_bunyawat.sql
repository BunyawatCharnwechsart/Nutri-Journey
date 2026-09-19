-- ============================================================================
-- delete_user_bunyawat.sql  <-- DESTRUCTIVE — RUN MANUALLY ONLY
-- ============================================================================
-- ลบข้อมูลทั้งหมดของ user "bunyawat" (match ด้วย display_name) จากทุกตารางที่
-- ผูกกับ user:
--   user_missions, healthy_journey, if_sessions, weight_logs,
--   measurement_logs, progress_photos, profiles, users
--
-- missions เป็นตารางกลาง (นิยาม mission) — ถูกเว้นไว้ออกแบบไม่โดนลบ.
-- remarks: progress-photos file objects ใน Storage ยังคงเหลือ (Supabase
-- ห้ามลบ storage.objects ผ่าน SQL) — ลบผ่าน Storage API/Dashboard แทน ตาม
-- photo_path ที่คัดลอกมาได้ก่อนลบ.
--
-- ⚠️ ไม่มี UNDO. Backup (Dashboard → Backups / SQL dump) ก่อน run.
-- ============================================================================

begin;

-- เก็บ user_id ไว้ชั่วคราว (session temp table) เพื่อเอาไป verify count = 0
create temp table _target_user (id uuid primary key);

do $$
declare
  target_user_id uuid;
begin
  -- หา user ตามชื่อ display_name (= "bunyawat") — อาจต้องแก้ให้ตรง data จริง
  select u.user_id into target_user_id
    from public.users u
   where lower(u.display_name) = 'bunyawat'
   limit 1;

  if target_user_id is null then
    raise exception 'user "bunyawat" not found in public.users';
  end if;

  insert into _target_user values (target_user_id);

  delete from public.user_missions    where user_id = target_user_id;
  delete from public.healthy_journey  where user_id = target_user_id;
  delete from public.if_sessions      where user_id = target_user_id;
  delete from public.weight_logs      where user_id = target_user_id;
  delete from public.measurement_logs where user_id = target_user_id;
  delete from public.progress_photos  where user_id = target_user_id;
  delete from public.profiles         where user_id = target_user_id;
  delete from public.users            where user_id = target_user_id;
end $$;

-- verify: ทุกตารางควรเหลือ rows_now = 0 (นอกจาก users ที่ user หายไปแล้ว)
select 'user_missions'::text as table_name, count(*)::int as rows_now
  from public.user_missions where user_id = (select id from _target_user)
union all
select 'healthy_journey', count(*)::int
  from public.healthy_journey where user_id = (select id from _target_user)
union all
select 'if_sessions', count(*)::int
  from public.if_sessions where user_id = (select id from _target_user)
union all
select 'weight_logs', count(*)::int
  from public.weight_logs where user_id = (select id from _target_user)
union all
select 'measurement_logs', count(*)::int
  from public.measurement_logs where user_id = (select id from _target_user)
union all
select 'progress_photos', count(*)::int
  from public.progress_photos where user_id = (select id from _target_user)
union all
select 'users', count(*)::int
  from public.users where user_id = (select id from _target_user);

drop table _target_user;

commit;