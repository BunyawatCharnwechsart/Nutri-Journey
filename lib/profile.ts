/**
 * Health profile option lists and helpers.
 *
 * This module is shared by both the client (form labels) and the server
 * (profile completeness check), so it must NOT import from "server-only"
 * or anything that leaks secrets to the browser bundle.
 */

export const GENDER_OPTIONS = [
  { value: "male", label: "ชาย" },
  { value: "female", label: "หญิง" },
  { value: "other", label: "ไม่ระบุ" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "ไม่ออกกำลังกาย / นั่งทำงานเป็นส่วนใหญ่" },
  { value: "light", label: "ออกกำลังกายเบาๆ 1–3 วัน/สัปดาห์" },
  { value: "moderate", label: "ออกกำลังกายปานกลาง 3–5 วัน/สัปดาห์" },
  { value: "active", label: "ออกกำลังกายหนัก 6–7 วัน/สัปดาห์" },
  { value: "very_active", label: "งานใช้แรง / ออกกำลังกายหนักวันละ 2 รอบ" },
] as const;

export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number]["value"];

export const GOAL_OPTIONS = [
  { value: "weight_loss", label: "ลดน้ำหนัก" },
  { value: "eating_behavior", label: "ปรับพฤติกรรมการกิน" },
  { value: "maintain_muscle", label: "รักษาขนาดกล้ามเนื้อ" },
  { value: "endurance_mindset", label: "ฝึกความอดทนเอาชนะใจตัวเอง" },
] as const;

export type Goal = (typeof GOAL_OPTIONS)[number]["value"];

/**
 * Returns true when a profile row has every health field filled out.
 * Column names follow the `profiles` table schema.
 */
export function isProfileComplete(
  profile: Record<string, unknown> | null | undefined
): boolean {
  if (!profile) {
    return false;
  }

  const requiredKeys = [
    "gender",
    "birth_date",
    "height",
    "weight",
    "activity_level",
  ];

  return requiredKeys.every(
    (key) => profile[key] !== null && profile[key] !== undefined && profile[key] !== ""
  );
}