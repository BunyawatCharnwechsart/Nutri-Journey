-- ============================================================================
-- 0021_seed_bunyawat_weight_logs.sql
--
-- Dev seed: mockup of Bunyawat's weekly weight logs (June 2026 -> latest) so
-- the monthly line chart has data to render. One entry per ~7 days, trend
-- ~0.5 kg/week down. The real entry on 2026-09-02 (88.0) is kept as-is.
--
-- Idempotent: upsert keyed on (user_id, recorded_on) -> safe to re-run.
--
-- Security: writes only the server-owned weight_logs table for this single
-- user (service-role connection bypasses RLS). profiles is NOT touched.
-- ============================================================================

do $$
declare
  bunyawat_user_id uuid;
  row_recorded_on  date;
  row_weight_kg    numeric;
  rows_payload     record;
begin
  -- Resolve Bunyawat by display name, with a UUID fallback known from the dev DB.
  select u.user_id into bunyawat_user_id
    from public.users u
   where u.display_name ilike 'bunyawat'
   limit 1;

  if bunyawat_user_id is null then
    bunyawat_user_id := '9f2a33e3-0009-4f99-be6a-6eacfa36536e'::uuid;
  end if;

  if not exists (select 1 from public.users where user_id = bunyawat_user_id) then
    raise exception 'Bunyawat user not found in public.users';
  end if;

  for rows_payload in
    values
      ('2026-06-03'::date, 94.0),
      ('2026-06-10'::date, 93.5),
      ('2026-06-17'::date, 93.0),
      ('2026-06-24'::date, 92.5),
      ('2026-07-01'::date, 92.0),
      ('2026-07-08'::date, 91.5),
      ('2026-07-15'::date, 91.0),
      ('2026-07-22'::date, 90.5),
      ('2026-07-29'::date, 90.0),
      ('2026-08-05'::date, 89.6),
      ('2026-08-12'::date, 89.2),
      ('2026-08-19'::date, 88.8),
      ('2026-08-26'::date, 88.4),
      ('2026-09-02'::date, 88.0)
  loop
    row_recorded_on := rows_payload.column1;
    row_weight_kg   := rows_payload.column2;

    insert into public.weight_logs (user_id, recorded_on, weight_kg, logged_at, updated_at)
    values (
      bunyawat_user_id,
      row_recorded_on,
      row_weight_kg,
      (row_recorded_on + time '12:00') at time zone 'Asia/Bangkok',
      (row_recorded_on + time '12:00') at time zone 'Asia/Bangkok'
    )
    on conflict (user_id, recorded_on) do update
      set weight_kg = excluded.weight_kg,
          updated_at = excluded.updated_at;
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- weight logging. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;