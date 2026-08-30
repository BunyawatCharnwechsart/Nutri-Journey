-- ============================================================================
-- 0015_measurements_in_inches.sql
-- Rename the profile body-measurement columns from centimetres to inches and
-- convert any existing stored values (cm ÷ 2.54, rounded to 1 decimal place).
--
-- Renamed columns:
--   waist_cm  -> waist_in
--   hip_cm    -> hip_in
--   chest_cm  -> chest_in
--
-- Idempotent: conversion only runs when the old *_cm column exists AND the new
-- *_in column does not (migration 0004 re-adds the *_cm columns on every full
-- migration run, so "both exist" must mean "already converted" -> skip).
-- The orphaned *_cm columns are dropped every run to stay fully idempotent.
-- ============================================================================

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'waist_cm'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'waist_in'
  ) then
    alter table public.profiles rename column waist_cm to waist_in;
    update public.profiles
       set waist_in = round((waist_in / 2.54)::numeric, 1)
     where waist_in is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'hip_cm'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'hip_in'
  ) then
    alter table public.profiles rename column hip_cm to hip_in;
    update public.profiles
       set hip_in = round((hip_in / 2.54)::numeric, 1)
     where hip_in is not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'chest_cm'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'chest_in'
  ) then
    alter table public.profiles rename column chest_cm to chest_in;
    update public.profiles
       set chest_in = round((chest_in / 2.54)::numeric, 1)
     where chest_in is not null;
  end if;
end $$;

-- Migration 0004 re-adds the *_cm columns on the next full migration run; drop
-- the orphaned (now empty) columns every run so re-runs never leave clutter.
alter table public.profiles drop column if exists waist_cm;
alter table public.profiles drop column if exists hip_cm;
alter table public.profiles drop column if exists chest_cm;

-- Defense-in-depth: re-assert that anon/authenticated can never touch profiles.
revoke all on table public.profiles from anon, authenticated;