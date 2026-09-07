-- ============================================================================
-- 0026_progress_photos.sql
-- Progress-photo tracking foundation:
--   * progress_photos table — one photo per view (front/side/back) per ICT
--     month per user. The "หนึ่งชุดต่อเดือน" rule is enforced at the app level
--     (a locked month can never be re-uploaded), plus a UNIQUE constraint on
--     (user_id, recorded_month, view) as a final guard against duplicates.
--   * storage bucket `progress-photos` (private) — images are stored there and
--     served back to the user via short-lived signed URLs.
--
-- Security: RLS + revoked grants on the table — only the service-role server
-- client can touch it. The bucket is private so objects are NOT publicly
-- addressable; access goes through signed URLs generated with the service key.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- progress_photos: one row per view per ICT month.
-- recorded_month stores the FIRST DAY of the month (yyyy-MM-01) as a date so
-- month filtering is a simple equality on the string prefix "yyyy-MM".
-- ----------------------------------------------------------------------------
create table if not exists public.progress_photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(user_id) on delete cascade,
  recorded_month date not null,
  view          text not null check (view in ('front', 'side', 'back')),
  photo_path    text not null,
  created_at    timestamptz not null default now()
);

-- One photo per view per month per user (final dedupe guard).
create unique index if not exists progress_photos_user_month_view_key
  on public.progress_photos (user_id, recorded_month, view);

-- Common query pattern: read every view for one user across a month range.
create index if not exists progress_photos_user_month_idx
  on public.progress_photos (user_id, recorded_month);

-- ----------------------------------------------------------------------------
-- Storage bucket for the images (private by default).
-- The migration runner re-runs the whole folder, so insert-on-conflict keeps
-- it idempotent. `storage` schema exists once Supabase Storage is enabled.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Security — service-role only, app enforces user_id in code.
-- ----------------------------------------------------------------------------
alter table public.progress_photos enable row level security;
revoke all on public.progress_photos from anon, authenticated;
