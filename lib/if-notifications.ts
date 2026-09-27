import { getEatingMinutes, getFastingMinutes } from "@/lib/if";

// ============================================================================
// Decide WHICH phase of an active IF session (if any) has reached its planned
// end time and has not been notified yet. Pure logic — the cron route feeds
// DB rows in here and gets back a decision, so it is easy to unit test.
//
// Reminder cadence:
//   * the PRE reminder fires ONCE while the user is still fasting and the
//     planned fasting end is 1 hour (FASTING_PRE_REMINDER_MS) away or less —
//     i.e. `now` is inside [fastingEnd - 1h, fastingEnd). Sessions shorter
//     than 1 hour of fasting never hit this window and are skipped. If the
//     run is already past the end, the "phase finished" reminder below takes
//     over instead (no belated pre-reminder).
//   * the FIRST "phase finished" reminder fires as soon as the phase has
//     target (fasting: `fasting_start_time + pattern hours`, eating:
//     `eating_start_time + pattern hours`). It even fires when the phase is
//     already long overdue and we never sent anything yet — a single late
//     nudge beats silence.
//   * while the phase is still running, the reminder repeats every
//     PHASE_REMINDER_INTERVAL_MS (30 minutes) as long as we are still inside
//     PHASE_REMINDER_WINDOW_MS (2 hours) from the target. This bounds the
//     spam: a forgotten session stops buzzing on its own.
//   * once the user stops the phase (fasting_end_time / eating_end_time is
//     set) the reminders stop — the action is theirs.
// ============================================================================

/** How long to wait before resending the "phase finished" reminder while the
 *  user has not stopped that phase yet. */
export const PHASE_REMINDER_INTERVAL_MS = 30 * 60 * 1000;

/** Stop repeating reminders once this much time has passed since the phase
 *  reached its target. */
export const PHASE_REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;

/** How early before the planned fasting end the one-time pre-reminder fires. */
export const FASTING_PRE_REMINDER_MS = 60 * 60 * 1000;

export type PhaseNotification =
  | { kind: "none" }
  | { kind: "send"; phase: "fasting_pre" | "fasting" | "eating" };

interface SessionTimingInput {
  fasting_start_time: string | null;
  fasting_end_time: string | null;
  fasting_pre_notified_at: string | null;
  fasting_end_notified_at: string | null;
  eating_start_time: string | null;
  eating_end_time: string | null;
  eating_end_notified_at: string | null;
  if_pattern: string | null;
}

/** Overridable for tests so we don't have to wait real minutes/hours. */
interface ReminderOptions {
  reminderIntervalMs?: number;
  reminderWindowMs?: number;
  preReminderMs?: number;
}

function plannedEndMs(
  startIso: string | null,
  plannedMinutes: number
): number | null {
  if (!startIso || plannedMinutes <= 0) {
    return null;
  }
  const start = new Date(startIso).getTime();
  if (Number.isNaN(start)) {
    return null;
  }
  return start + plannedMinutes * 60_000;
}

function parseIsoMs(value: string | null): number | null {
  if (!value) {
    return null;
  }
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Returns `{ kind: "send", phase }` when the running phase should be reminded
 * about its finished target time, `{ kind: "none" }` otherwise.
 *
 * A phase is only "due" while it is still running:
 *  - fasting phase: fasting_end_time is null (user has not stopped fasting).
 *  - eating phase:  fasting_end_time is set (fasting done) and eating_end_time
 *    is still null (user has not finished eating).
 */
export function duePhaseNotification(
  nowMs: number,
  session: SessionTimingInput,
  options: ReminderOptions = {}
): PhaseNotification {
  const intervalMs = options.reminderIntervalMs ?? PHASE_REMINDER_INTERVAL_MS;
  const windowMs = options.reminderWindowMs ?? PHASE_REMINDER_WINDOW_MS;
  const preMs = options.preReminderMs ?? FASTING_PRE_REMINDER_MS;

  if (!session.fasting_start_time) {
    return { kind: "none" };
  }

  // ---- Fasting phase (still running) ----
  if (!session.fasting_end_time) {
    const fastingEnd = plannedEndMs(
      session.fasting_start_time,
      getFastingMinutes(session.if_pattern)
    );
    // One-time pre-reminder: only while we have not passed the end yet.
    // Checked FIRST so the "phase finished" reminder below does not swallow it.
    if (
      fastingEnd !== null &&
      shouldSendPreReminder(nowMs, session, fastingEnd, preMs)
    ) {
      return { kind: "send", phase: "fasting_pre" };
    }
    if (
      fastingEnd !== null &&
      shouldRemind(
        nowMs,
        fastingEnd,
        session.fasting_end_notified_at,
        intervalMs,
        windowMs
      )
    ) {
      return { kind: "send", phase: "fasting" };
    }
    return { kind: "none" };
  }

  // ---- Eating phase (still running) ----
  if (!session.eating_end_time) {
    const eatingEnd = plannedEndMs(
      session.eating_start_time,
      getEatingMinutes(session.if_pattern)
    );
    if (
      eatingEnd !== null &&
      shouldRemind(
        nowMs,
        eatingEnd,
        session.eating_end_notified_at,
        intervalMs,
        windowMs
      )
    ) {
      return { kind: "send", phase: "eating" };
    }
    return { kind: "none" };
  }

  return { kind: "none" };
}

/**
 * True when the one-time "1 hour left" fasting pre-reminder should fire.
 * Sends at most once per session (`fasting_pre_notified_at` stays null until
 * the cron marks it after a successful push):
 *   - `now` is inside [fastingEnd - preMs, fastingEnd) — never belated.
 *   - the fasting window is longer than the pre-reminder lead (otherwise the
 *     pre-time would fall before the user even started fasting).
 *   - no pre-reminder AND no "phase finished" reminder was sent yet.
 */
function shouldSendPreReminder(
  nowMs: number,
  session: SessionTimingInput,
  fastingEndMs: number,
  preMs: number
): boolean {
  if (session.fasting_pre_notified_at !== null) {
    return false; // already sent — once per session
  }
  if (session.fasting_end_notified_at !== null) {
    return false; // the "finished" reminder already went out
  }
  const startMs = parseIsoMs(session.fasting_start_time);
  if (startMs === null) {
    return false;
  }
  const preAtMs = fastingEndMs - preMs;
  if (preAtMs < startMs) {
    return false; // fasting shorter than the lead time — skip
  }
  return nowMs >= preAtMs && nowMs < fastingEndMs;
}

function shouldRemind(
  nowMs: number,
  phaseEndMs: number,
  lastNotifiedIso: string | null,
  intervalMs: number,
  windowMs: number
): boolean {
  if (nowMs < phaseEndMs) {
    return false; // target not reached yet
  }

  const lastNotifiedMs = parseIsoMs(lastNotifiedIso);
  if (lastNotifiedMs === null) {
    return true; // first reminder — always send, even when quite late
  }

  // Repeat only while (a) the interval has passed since the last send and
  // (b) we are still inside the reminder window measured from the target.
  return (
    nowMs - lastNotifiedMs >= intervalMs && nowMs - phaseEndMs <= windowMs
  );
}