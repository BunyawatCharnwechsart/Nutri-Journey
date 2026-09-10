import { z } from "zod";

import { IF_PATTERN_VALUES, MOOD_VALUES } from "@/lib/if";

export const loginSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
});

export const ifStartSchema = z.object({
  ifPattern: z.enum(IF_PATTERN_VALUES, {
    message: "รูปแบบ IF ไม่ถูกต้อง",
  }),
});

export const sessionIdSchema = z.object({
  sessionId: z.string().uuid("sessionId ต้องเป็น UUID"),
});

/**
 * POST /api/v1/if-sessions/end
 * จบเซสชัน + บันทึกอารมณ์ (mood) ที่เลือกตอนสิ้นสุด IF — ค่าเป็น text 1 ใน 5
 * ระดับ ("Very bad" / "Bad" / "Medium" / "Good" / "Very good") ตาม MOOD_VALUES
 * ใน lib/if.ts ตรงกับ CHECK constraint ใน migration 0024.
 * บังคับให้ส่ง เพราะ UI มี Mood picker ก่อนกด "สิ้นสุดการกิน".
 */
export const endSessionSchema = sessionIdSchema.extend({
  mood: z.enum(MOOD_VALUES, { message: "อารมณ์ไม่ถูกต้อง" }),
});

/** จำกัดให้แก้เวลาได้ไม่เกิน 7 วันย้อนหลัง (จาก API ถูกยิงตรง ข้าม UI ได้). */
export const MAX_EDIT_TIME_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * PATCH /api/v1/if-sessions/edit-time
 * `newStartTime` ต้องเป็น ISO 8601 ที่ parse ได้ เช่น "2026-09-05T23:50:00.000Z".
 */
export const editTimeSchema = z.object({
  sessionId: z.string().uuid("sessionId ต้องเป็น UUID"),
  newStartTime: z.string().datetime({
    offset: true,
    message: "newStartTime ต้องเป็น ISO 8601",
  }),
});

/**
 * ตรวจว่าค่าเวลาที่แก้ใหม่ใช้ได้: ต้องไม่เป็นอนาคต และไม่ย้อนหลังเกิน
 * MAX_EDIT_TIME_AGE_MS. แยกเป็น pure function เพื่อให้เทสต์ได้กำหนด nowMs เอง.
 */
export function isValidEditTime(newTimeMs: number, nowMs: number): boolean {
  if (newTimeMs > nowMs) {
    return false;
  }
  return nowMs - newTimeMs <= MAX_EDIT_TIME_AGE_MS;
}

/**
 * Health profile form (set during first-time setup after LINE login).
 *
 * `birthDate` is an ISO date ("YYYY-MM-DD") from <input type="date">.
 * `heightCm` and `weightKg` are coerced from strings to numbers so invalid
 * input is rejected with a 400 before it ever reaches the database.
 */
export const healthProfileSchema = z.object({
  gender: z.enum(["male", "female", "other"]),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันเกิดไม่ถูกต้อง")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "วันเดือนปีเกิดไม่ถูกต้อง"
    )
    .refine(
      (value) => new Date(value) <= new Date(),
      "วันเดือนปีเกิดต้องไม่เป็นวันที่ในอนาคต"
    ),
  heightCm: z.coerce.number().int().min(50).max(250),
  weightKg: z.coerce.number().min(20).max(300),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),

  // Required fields (step 2 + step 3 of the health profile wizard).
  // Measurements are captured in inches and stored in inches.
  waistIn: z.coerce.number().min(12).max(98),
  hipIn: z.coerce.number().min(12).max(98),
  chestIn: z.coerce.number().min(12).max(98),
  goal: z.enum([
    "weight_loss",
    "eating_behavior",
    "maintain_muscle",
    "endurance_mindset",
  ]),
  targetWeightKg: z.coerce.number().min(20).max(300),
});

/**
 * Basic profile edit (from the "แก้ไขข้อมูล" modal on the profile page).
 * Only static info may change here: gender, birth date, height, activity
 * level, goal and target weight. Weight is deliberately absent — weight_logs
 * owns it (see /api/v1/weight-logs), and measurements have their own flow.
 */
export const editProfileSchema = z.object({
  gender: z.enum(["male", "female", "other"]),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันเกิดไม่ถูกต้อง")
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "วันเดือนปีเกิดไม่ถูกต้อง"
    )
    .refine(
      (value) => new Date(value) <= new Date(),
      "วันเดือนปีเกิดต้องไม่เป็นวันที่ในอนาคต"
    ),
  heightCm: z.coerce.number().int().min(50).max(250),
  activityLevel: z.enum([
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goal: z.enum([
    "weight_loss",
    "eating_behavior",
    "maintain_muscle",
    "endurance_mindset",
  ]),
  targetWeightKg: z.coerce.number().min(20).max(300),
});

/**
 * Record a new weight (from the "อัปเดตน้ำหนัก" modal on the health profile).
 */
export const weightLogSchema = z.object({
  weightKg: z.coerce
    .number()
    .min(20, "น้ำหนักต้องอยู่ระหว่าง 20-300 กก.")
    .max(300, "น้ำหนักต้องอยู่ระหว่าง 20-300 กก."),
});

/**
 * Record new body measurements (from the "อัปเดตสัดส่วน" modal).
 *
 * Each measurement is optional so the user may update only the fields they
 * want (e.g. just the waist). At least one measurement must be provided.
 * Measurements are captured in inches.
 *
 * Note on coercion: an empty string from the client must NOT be treated as a
 * valid number. Using `.optional()` directly on a coerced field would coerce
 * "" to a number, which we do not want. Instead we coerce to `number`, then
 * `.optional()` — but since the client sends omitted fields as `undefined`,
 * we preprocess empty strings to `undefined` before validation.
 */
/**
 * Query params for GET /api/v1/progress-photos. `months` bounds how far back
 * the compare view reaches (default 12, max 24). Only `months` is
 * client-controlled and it is whitelisted/rescaled before hitting the DB.
 */
export const progressPhotoQuerySchema = z.object({
  months: z.coerce
    .number()
    .int("months ต้องเป็นจำนวนเต็ม")
    .min(1, "months ต้องไม่น้อยกว่า 1")
    .max(24, "months ต้องไม่เกิน 24")
    .optional()
    .default(12),
});

export const measurementLogSchema = z
  .object({
    waistIn: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce
        .number()
        .min(12, "รอบเอวต้องอยู่ระหว่าง 12-98 นิ้ว")
        .max(98, "รอบเอวต้องอยู่ระหว่าง 12-98 นิ้ว")
        .optional()
    ),
    hipIn: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce
        .number()
        .min(12, "รอบสะโพกต้องอยู่ระหว่าง 12-98 นิ้ว")
        .max(98, "รอบสะโพกต้องอยู่ระหว่าง 12-98 นิ้ว")
        .optional()
    ),
    chestIn: z.preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce
        .number()
        .min(12, "รอบอกต้องอยู่ระหว่าง 12-98 นิ้ว")
        .max(98, "รอบอกต้องอยู่ระหว่าง 12-98 นิ้ว")
        .optional()
    ),
  })
  .refine(
    (data) =>
      data.waistIn !== undefined ||
      data.hipIn !== undefined ||
      data.chestIn !== undefined,
    { message: "กรุณากรอกสัดส่วนอย่างน้อย 1 ค่า", path: ["waistIn"] }
  );

/**
 * PATCH /api/v1/healthy-journey
 * เปลี่ยนชื่อไข่ (avatar) — trim แล้ว ไม่เกิน 20 ตัวอักษร.
 */
export const avatarNameSchema = z.object({
  avatarName: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อไข่")
    .max(20, "ชื่อไข่ต้องไม่เกิน 20 ตัวอักษร"),
});
