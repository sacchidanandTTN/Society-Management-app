import { z } from "zod";

const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone number must be exactly 10 digits.")
  .regex(/^[6-9]/, "Phone number must start with 6, 7, 8, or 9.")
  .refine((value) => !/^(\d)\1{9}$/.test(value), "Phone number cannot have all digits same.");

const residentBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: indianPhoneSchema,
});

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
  .regex(/[a-z]/, "Password must include at least one lowercase letter.")
  .regex(/[0-9]/, "Password must include at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character.");

const residentIdParamSchema = z.object({
  residentId: z.string().uuid(),
});

const listResidentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
});

const createResidentSchema = z.object({
  body: residentBodySchema.extend({
    password: passwordSchema,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const updateResidentSchema = z.object({
  body: residentBodySchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one field."
  ),
  params: residentIdParamSchema,
  query: z.object({}).default({}),
});

const residentByIdSchema = z.object({
  body: z.object({}).default({}),
  params: residentIdParamSchema,
  query: z.object({}).default({}),
});

const listResidentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: listResidentsQuerySchema,
});

export {
  createResidentSchema,
  updateResidentSchema,
  residentByIdSchema,
  listResidentsSchema,
};
