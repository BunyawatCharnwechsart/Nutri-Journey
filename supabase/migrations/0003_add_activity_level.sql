-- ============================================================================
-- 0003_add_activity_level.sql
-- Add the physical activity level column to profiles. Needed by the health
-- profile form (dropdown) and for future TDEE calculations.
--
-- Idempotent: can be re-run safely.
-- ============================================================================

alter table public.profiles
  add column if not exists activity_level text;

-- New column inherits the table's RLS + revoked grants from 0001/0002,
-- so no further grant statements are required here.