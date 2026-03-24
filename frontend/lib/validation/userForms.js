import { z } from "zod";

const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone must be exactly 10 digits")
  .regex(/^[6-9]/, "Phone must start with 6, 7, 8, or 9")
  .refine((value) => !/^(\d)\1{9}$/.test(value), "Phone cannot have all digits same");

export const userPayNowSchema = z
  .object({
    monthly_record_id: z.string().uuid("Select a pending monthly record."),
    payment_mode: z.literal("razorpay"),
  });

export const userProfileSchema = z
  .object({
    phone: indianPhoneSchema,
  })
  .refine((value) => Boolean(value.phone), "Phone is required.");

export const userChangePasswordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be at most 72 characters")
      .regex(/[A-Z]/, "Password must include an uppercase letter")
      .regex(/[a-z]/, "Password must include a lowercase letter")
      .regex(/[0-9]/, "Password must include a number")
      .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
    confirm_password: z.string(),
  })
  .refine((value) => value.new_password === value.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
