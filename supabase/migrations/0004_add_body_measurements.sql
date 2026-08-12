-- ============================================================================
-- 0004_add_body_measurements.sql
-- Add optional body measurements and target-goal columns to profiles. Used by
-- the multi-step health profile wizard (step 2: measurements; step 3: goals).
-- All fields are nullable; skipping them is allowed.
--
-- Idempotent: can be re-run safely.
-- ============================================================================

alter table public.profiles
  add column if not exists waist_cm numeric,
  add column if not exists hip_cm   numeric,
  add column if not exists chest_cm numeric;

-- New columns inherit the table's RLS + revoked grants from 0001/0002,
-- so no further grant statements are required here.