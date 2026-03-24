import { z } from "zod";

const createSubscriptionPlanSchema = z.object({
  body: z.object({
    flat_type_id: z.string().uuid(),
    monthly_amount: z.coerce.number().positive(),
    effective_from: z.string().date(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const listSubscriptionPlansSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    flat_type_id: z.string().uuid().optional(),
  }),
});

const generateMonthlyRecordsSchema = z.object({
  body: z.object({
    month: z.coerce.number().int().min(1).max(12),
    year: z.coerce.number().int().min(2000).max(2100),
    due_date: z.string().date().optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const listMonthlyRecordsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    flat_id: z.string().uuid().optional(),
    status: z.enum(["pending", "paid"]).optional(),
  }),
});

export {
  createSubscriptionPlanSchema,
  listSubscriptionPlansSchema,
  generateMonthlyRecordsSchema,
  listMonthlyRecordsSchema,
};
