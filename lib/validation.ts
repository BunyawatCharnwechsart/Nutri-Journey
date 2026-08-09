import { z } from "zod";

export const loginSchema = z.object({
  idToken: z.string().min(1, "idToken is required"),
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
});
