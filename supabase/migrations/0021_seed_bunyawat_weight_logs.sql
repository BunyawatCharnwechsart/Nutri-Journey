-- ============================================================================
-- 0021_seed_bunyawat_weight_logs.sql
--
-- Dev seed: mockup of Bunyawat's weekly weight logs covering a full year
-- (Sep 2025 -> latest) so both the 3-month quarter chart and the 1-year chart
-- have data to render. One entry per week (Wednesdays, every ~7 days).
--
-- The series uses a gentle downward trend (~94 kg -> 88 kg across 52 weeks,
-- about -0.12 kg/week) with a small deterministic wobble (+/-0.1-0.2 kg) so
-- the line looks realistic instead of perfectly straight.
--
-- The real entry on 2026-09-02 (88.0) is kept as-is via its own explicit
-- upsert AFTER the generated series, so the formula never touches it.
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

  -- 52 weekly points (weeks 0..51): 2025-09-03 -> 2026-08-26.
  -- Weight = linear fall 94.0 -> 88.0, plus a deterministic wobble so the
  -- curve has gentle ups and downs instead of a straight descending line.
  for rows_payload in
    select
      (date '2025-09-03' + (w * interval '7 days'))::date as recorded_on,
      round(
        (94.0 - 6.0 * w::numeric / 51.0
         + case w % 4
             when 0 then 0.0
             when 1 then -0.1
             when 2 then 0.1
             else 0.2
           end)::numeric,
        1
      ) as weight_kg
    from generate_series(0, 51) as w
  loop
    row_recorded_on := rows_payload.recorded_on;
    row_weight_kg   := rows_payload.weight_kg;

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

  -- The real entry is kept as-is: not in the generated series, upserted
  -- explicitly so re-runs always keep it at the user's actual value.
  insert into public.weight_logs (user_id, recorded_on, weight_kg, logged_at, updated_at)
  values (
    bunyawat_user_id,
    '2026-09-02'::date,
    88.0,
    ('2026-09-02'::date + time '12:00') at time zone 'Asia/Bangkok',
    ('2026-09-02'::date + time '12:00') at time zone 'Asia/Bangkok'
  )
  on conflict (user_id, recorded_on) do update
    set weight_kg = excluded.weight_kg,
        updated_at = excluded.updated_at;
end $$;

-- ----------------------------------------------------------------------------
-- Security (re-assert, idempotent) – publishable/anon key must never touch
-- weight logging. Service role only, and the app filters user_id in code.
-- ----------------------------------------------------------------------------
alter table public.weight_logs enable row level security;
revoke all on public.weight_logs from anon, authenticated;