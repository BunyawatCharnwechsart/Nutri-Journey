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

  // Optional fields (step 2 + step 3 of the health profile wizard).
  // Empty string from skipped inputs is treated as undefined so the numeric
  // enums can pass through as optional instead of failing coercion to NaN.
  waistCm: optionalCm(),
  hipCm: optionalCm(),
  chestCm: optionalCm(),
  goal: z
    .enum(["weight_loss", "eating_behavior", "maintain_muscle", "endurance_mindset"])
    .optional(),
  targetWeightKg: z.coerce.number().min(20).max(300).optional(),
});

/**
 * Coerces a string-or-number into an optional, range-checked centimetre
 * value. Blank input becomes undefined; anything else must be a decimal
 * number inside the stated range.
 */
function optionalCm() {
  return z
    .preprocess(
      (value) =>
        value === "" || value === null || value === undefined
          ? undefined
          : value,
      z.coerce.number().min(30).max(250).optional()
    );
}
