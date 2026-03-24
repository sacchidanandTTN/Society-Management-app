import { z } from "zod";

const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
  .regex(/^[6-9]/, "Phone number must start with 6, 7, 8, or 9")
  .refine((value) => !/^(\d)\1{9}$/.test(value), "Phone number cannot have all digits same");

const flatNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]-\d{3}$/, "Flat number must be in format like A-101 or A-001");

export const residentFormSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Valid email is required"),
  phone: indianPhoneSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character")
    .optional()
    .or(z.literal("")),
});

export const flatTypeFormSchema = z.object({
  name: z.string().trim().min(2, "Flat type name is required"),
  description: z.string().trim().optional(),
});

export const flatFormSchema = z.object({
  flat_number: flatNumberSchema,
  flat_type_id: z.string().uuid("Select a flat type"),
});

export const allocationFormSchema = z.object({
  flat_id: z.string().uuid("Select a flat"),
  resident_id: z.string().uuid("Select a resident"),
});

export const subscriptionPlanFormSchema = z.object({
  flat_type_id: z.string().uuid("Select a flat type"),
  monthly_amount: z.coerce.number().positive("Amount must be greater than 0"),
  effective_from: z.string().min(1, "Effective from date is required"),
});

export const monthlyGenerateFormSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  due_date: z.string().optional(),
});

export const paymentFormSchema = z
  .object({
    monthly_record_id: z.string().uuid().optional(),
    flat_id: z.string().uuid().optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    payment_mode: z.enum(["cash", "upi", "razorpay"]),
    amount: z.coerce.number().positive().optional(),
  })
  .refine(
    (value) =>
      Boolean(value.monthly_record_id) ||
      (Boolean(value.flat_id) && Boolean(value.month) && Boolean(value.year)),
    "Provide monthly record or flat + month + year."
  );

export const notificationFormSchema = z.object({
  title: z.string().trim().min(2, "Title is required"),
  message: z.string().trim().min(2, "Message is required"),
});
