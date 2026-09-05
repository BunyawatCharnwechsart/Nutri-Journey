import { z } from "zod";

import { IF_PATTERN_VALUES } from "@/lib/if";

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
 * Record a new weight (from the "อัปเดตน้ำหนัก" modal on the health profile).
 */
export const weightLogSchema = z.object({
  weightKg: z.coerce
    .number()
    .min(20, "น้ำหนักต้องอยู่ระหว่าง 20-300 กก.")
    .max(300, "น้ำหนักต้องอยู่ระหว่าง 20-300 กก."),
});

/**
 * Query params for GET /api/v1/weight-logs. `months` controls how far back in
 * time the history window reaches (default 3). Coerced from a string so a
 * non-numeric value is rejected with a 400 before it reaches the database.
 */
export const weightLogQuerySchema = z.object({
  months: z.coerce
    .number()
    .int("months ต้องเป็นจำนวนเต็ม")
    .min(1, "months ต้องไม่น้อยกว่า 1")
    .max(12, "months ต้องไม่เกิน 12")
    .optional()
    .default(3),
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
