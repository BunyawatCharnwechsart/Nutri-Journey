-- ============================================================================
-- 0017_weight_tracking_fix.sql
--
-- Fixes the 500 errors on profile saves & weight updates ("Failed to save
-- profile" / "บันทึกน้ำหนักไม่สำเร็จ").
--
-- Cause: the legacy `weight_logs.weight` column is NOT NULL with no default.
-- Every feature insert (profile-setup anchor + weight update) writes
-- weight_kg / recorded_on / updated_at but not `weight`, so each insert
-- violated NOT NULL. The column is dead — its data was backfilled into
-- weight_kg by 0016 and nothing (code/trigger) reads `weight` anymore.
--
-- Security: RLS + revoked grants re-asserted (idempotent) so only the
-- service-role server client can touch the table.
-- ============================================================================

alter table public.weight_logs
  drop column if exists weight;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- weight logging. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;