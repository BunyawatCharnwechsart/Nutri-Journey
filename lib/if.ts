/**
 * IF fasting pattern options and helpers.
 *
 * This module is shared by both the client (IfTracker UI) and the server
 * (API validation), so it must NOT import from "server-only" or anything
 * that leaks secrets to the browser bundle.
 */

export const IF_PATTERN_VALUES = [
  "12:12",
  "14:10",
  "16:8",
  "18:6",
  "20:4",
] as const;

export type IfPattern = (typeof IF_PATTERN_VALUES)[number];

export const IF_PATTERNS: ReadonlyArray<{
  value: IfPattern;
  label: string;
  fastingHours: number;
  description: string;
}> = [
  { value: "12:12", label: "12:12", fastingHours: 12, description: "อด 12 ชม. กิน 12 ชม." },
  { value: "14:10", label: "14:10", fastingHours: 14, description: "อด 14 ชม. กิน 10 ชม." },
  { value: "16:8", label: "16:8", fastingHours: 16, description: "อด 16 ชม. กิน 8 ชม." },
  { value: "18:6", label: "18:6", fastingHours: 18, description: "อด 18 ชม. กิน 6 ชม." },
  { value: "20:4", label: "20:4", fastingHours: 20, description: "อด 20 ชม. กิน 4 ชม." },
];

/** Returns the pattern object for a value, or null when unknown. */
export function getIfPattern(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  return IF_PATTERNS.find((pattern) => pattern.value === value) ?? null;
}

/** Planned fasting duration in minutes for a given pattern. */
export function getFastingMinutes(value: string | null | undefined): number {
  const pattern = getIfPattern(value);
  return pattern ? pattern.fastingHours * 60 : 0;
}

/**
 * Formats a duration in minutes into a short, human-readable Thai string:
 * "16 ชม." / "30 นาที" / "16 ชม. 30 นาที" / "—" when null/0.
 */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) {
    return "—";
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (hours === 0) {
    return `${mins} นาที`;
  }
  if (mins === 0) {
    return `${hours} ชม.`;
  }
  return `${hours} ชม. ${mins} นาที`;
}