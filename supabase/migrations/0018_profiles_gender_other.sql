-- ============================================================================
-- 0018_profiles_gender_other.sql
--
-- The app (lib/profile.ts GENDER_OPTIONS + zod) supports three genders:
--   male / female / other ("ไม่ระบุ")
-- but the DB CHECK constraint only accepted two (male/female). Submitting the
-- "other" option therefore failed at the DB layer with
--   "Failed to save profile" (500).
--
-- Widen the CHECK so the database matches the application. Idempotent: drops
-- the old constraint if present, then re-creates it accepting all three.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_gender_check;

alter table public.profiles
  add constraint profiles_gender_check
  check (gender in ('male', 'female', 'other'));