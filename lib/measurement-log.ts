import {
  canUpdateWeight,
  daysUntilNextUpdate,
  diffCalendarDays,
  getICTDateKey,
  nextMonthlyUpdateLabel,
} from "@/lib/weight-log";

export {
  canUpdateWeight as canUpdateMeasurement,
  daysUntilNextUpdate as daysUntilNextMeasurementUpdate,
  diffCalendarDays,
  getICTDateKey,
  nextMonthlyUpdateLabel,
};

// ============================================================================
// Pure measurement-update gate logic.
//
// The user may record new measurements ONCE per ICT calendar month — counted
// by the month of their LAST recorded entry (measurement_logs.recorded_on).
// The gate is date-flexible (any day of the month), matching the monthly LINE
// reminder on the 1st. A brand-new user with no history is always allowed.
//
// The logic is shared with the weight gate (`lib/weight-log.ts`) — both are a
// plain "once per ICT month" rule, so the functions are aliased instead of
// duplicated. All helpers are pure (no I/O) so they are easy to unit test; the
// API route feeds DB values in here and acts on the boolean result.
// ============================================================================