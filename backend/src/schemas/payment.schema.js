import { z } from "zod";

const paymentModeSchema = z.enum(["cash", "upi", "razorpay"]);

const createPaymentSchema = z.object({
  body: z
    .object({
      monthly_record_id: z.string().uuid().optional(),
      flat_id: z.string().uuid().optional(),
      month: z.coerce.number().int().min(1).max(12).optional(),
      year: z.coerce.number().int().min(2000).max(2100).optional(),
      payment_mode: paymentModeSchema,
      amount: z.coerce.number().positive().optional(),
    })
    .refine(
      (value) =>
        Boolean(value.monthly_record_id) ||
        (Boolean(value.flat_id) && Boolean(value.month) && Boolean(value.year)),
      "Provide monthly_record_id or flat_id + month + year."
    ),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const listPaymentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    payment_status: z.enum(["pending", "completed", "failed"]).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    payment_month: z.coerce.number().int().min(1).max(12).optional(),
    payment_year: z.coerce.number().int().min(2000).max(2100).optional(),
    flat_id: z.string().uuid().optional(),
  }),
});

export { createPaymentSchema, listPaymentsSchema };
