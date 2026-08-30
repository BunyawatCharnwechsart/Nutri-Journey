import { getEatingMinutes, getFastingMinutes } from "@/lib/if";

// ============================================================================
// Decide WHICH phase of an active IF session (if any) has reached its planned
// end time and has not been notified yet. Pure logic — the cron route feeds
// DB rows in here and gets back a decision, so it is easy to unit test.
//
// Reminder cadence:
//   * the FIRST reminder fires as soon as the phase has reached its planned
//     target (fasting: `fasting_start_time + pattern hours`, eating:
//     `eating_start_time + pattern hours`). It even fires when the phase is
//     already long overdue and we never sent anything yet — a single late
//     nudge beats silence.
//   * while the phase is still running, the reminder repeats every
//     PHASE_REMINDER_INTERVAL_MS (10 minutes) as long as we are still inside
//     PHASE_REMINDER_WINDOW_MS (3 hours) from the target. This bounds the
//     spam: a forgotten session stops buzzing on its own.
//   * once the user stops the phase (fasting_end_time / eating_end_time is
//     set) the reminders stop — the action is theirs.
// ============================================================================

/** How long to wait before resending the "phase finished" reminder while the
 *  user has not stopped that phase yet. */
export const PHASE_REMINDER_INTERVAL_MS = 10 * 60 * 1000;

/** Stop repeating reminders once this much time has passed since the phase
 *  reached its target. */
export const PHASE_REMINDER_WINDOW_MS = 3 * 60 * 60 * 1000;

export type PhaseNotification =
  | { kind: "none" }
  | { kind: "send"; phase: "fasting" | "eating" };

interface SessionTimingInput {
  fasting_start_time: string | null;
  fasting_end_time: string | null;
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

  if (!session.fasting_start_time) {
    return { kind: "none" };
  }

  // ---- Fasting phase (still running) ----
  if (!session.fasting_end_time) {
    const fastingEnd = plannedEndMs(
      session.fasting_start_time,
      getFastingMinutes(session.if_pattern)
    );
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