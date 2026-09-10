-- ============================================================================
-- 0028_healthy_journey.sql
--
-- Healthy Journey (gamification) foundation — reads/writes the existing
-- missions / user_missions / healthy_journey tables created out-of-band:
--   * missions.code (unique) — stable programmatic key for the 4 daily
--     missions, so awarding XP never depends on a title string.
--   * seed the 4 daily missions (upsert by code, idempotent).
--   * healthy_journey.avatar_name — user-renamable egg name (defaults to
--     "ไข่" when the row is first created by the award service).
--   * unique index on healthy_journey(user_id) so upserts are race-safe.
--
-- Streak fields (current_streak / longest_streak / last_active_date) are left
-- untouched by design — the streak system is intentionally not in scope.
--
-- Security: re-assert RLS is enabled and the publishable (anon/authenticated)
-- roles cannot touch anything here. RLS gives defense-in-depth; the app only
-- reaches these tables through the service role + requireAuth() scoping.
--
-- Idempotent (runnable repeatedly).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- missions: stable code + seed.
-- ---------------------------------------------------------------------------
alter table public.missions
  add column if not exists code text;

create unique index if not exists missions_code_key on public.missions (code);

insert into public.missions (code, title, description, points, mission_type, is_daily)
values
  ('start_if',          'เริ่มทำ IF',             'กดเริ่มทำ IF หนึ่งครั้ง',               50, 'daily', true),
  ('fasting_complete',  'อดอาหารครบตามเป้า',     'จบ IF อย่างสำเร็จตามรูปแบบที่ตั้งไว้',   50, 'daily', true),
  ('record_mood',       'บันทึกความรู้สึก',       'บันทึกความรู้สึกหลังสิ้นสุด IF',         50, 'daily', true),
  ('view_stats',        'เข้าดูสถิติ',            'เข้ามาดูหน้าสถิติ',                      50, 'daily', true)
on conflict (code) do update
set
  title = excluded.title,
  description = excluded.description,
  points = excluded.points,
  mission_type = excluded.mission_type,
  is_daily = excluded.is_daily;

-- ---------------------------------------------------------------------------
-- healthy_journey: renamable egg name + race-safe upsert key.
-- ---------------------------------------------------------------------------
alter table public.healthy_journey
  add column if not exists avatar_name text;

create unique index if not exists healthy_journey_user_id_key
  on public.healthy_journey (user_id);

-- Fast lookup of "already completed today" during awards.
create index if not exists user_missions_today_idx
  on public.user_missions (user_id, mission_id)
  where is_completed;

-- ---------------------------------------------------------------------------
-- Security.
-- ---------------------------------------------------------------------------
alter table public.missions enable row level security;
alter table public.user_missions enable row level security;
alter table public.healthy_journey enable row level security;
alter table public.notifications enable row level security;

revoke all on public.missions from anon, authenticated;
revoke all on public.user_missions from anon, authenticated;
revoke all on public.healthy_journey from anon, authenticated;
revoke all on public.notifications from anon, authenticated;