import { getEatingMinutes, getFastingMinutes } from "@/lib/if";

// ============================================================================
// Decide WHICH phase of an active IF session (if any) has reached its planned
// end time and has not been notified yet. Pure logic — the cron route feeds
// DB rows in here and gets back a decision, so it is easy to unit test.
// ============================================================================

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

/**
 * Returns `{ kind: "send", phase }` when a phase has finished its planned time
 * and we have not pushed for it yet, `{ kind: "none" }` otherwise.
 *
 * A phase is only "due" while it is still running:
 *  - fasting phase: fasting_end_time is null (user has not stopped fasting).
 *  - eating phase:  fasting_end_time is set (eating started) and eating_end_time
 *    is still null (user has not finished eating).
 * Once the user stops a phase, the action is theirs — no notification needed.
 */
export function duePhaseNotification(
  nowMs: number,
  session: SessionTimingInput
): PhaseNotification {
  if (!session.fasting_start_time) {
    return { kind: "none" };
  }

  // ---- Fasting phase (still running) ----
  if (!session.fasting_end_time) {
    if (session.fasting_end_notified_at) {
      return { kind: "none" };
    }
    const fastingEnd = plannedEndMs(
      session.fasting_start_time,
      getFastingMinutes(session.if_pattern)
    );
    if (fastingEnd !== null && nowMs >= fastingEnd) {
      return { kind: "send", phase: "fasting" };
    }
    return { kind: "none" };
  }

  // ---- Eating phase (still running) ----
  if (!session.eating_end_time) {
    if (session.eating_end_notified_at) {
      return { kind: "none" };
    }
    const eatingEnd = plannedEndMs(
      session.eating_start_time,
      getEatingMinutes(session.if_pattern)
    );
    if (eatingEnd !== null && nowMs >= eatingEnd) {
      return { kind: "send", phase: "eating" };
    }
    return { kind: "none" };
  }

  return { kind: "none" };
}