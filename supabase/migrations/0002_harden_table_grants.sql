-- ============================================================================
-- 0002_harden_table_grants.sql
-- Revoke anon/authenticated grants on ALL public tables.
--
-- The server reads/writes exclusively with the service role key (which
-- bypasses RLS) and enforces user scoping in code via requireAuth(). The
-- publishable key ships in the browser bundle, so the anon role must not be
-- able to touch any table directly.
-- Idempotent: revoking a privilege that was never granted is a no-op.
-- ============================================================================

do $$
declare
  t record;
begin
  for t in
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
  loop
    execute format('revoke all on public.%I from anon, authenticated', t.table_name);
  end loop;
end $$;
