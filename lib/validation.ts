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

// ---- Google Health ----

export const googleHealthSyncSchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
});

export const googleHealthDailySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "รูปแบบวันที่ไม่ถูกต้อง"),
});
