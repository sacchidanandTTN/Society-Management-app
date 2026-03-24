import { z } from "zod";

const flatNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]-\d{3}$/, "Flat number must be in format like A-101 or A-001.");

const flatTypeBodySchema = z.object({
  name: z.string().trim().min(2).max(50),
  description: z.string().trim().max(500).optional().default(""),
});

const flatBodySchema = z.object({
  flat_number: flatNumberSchema,
  flat_type_id: z.string().uuid(),
  is_active: z.boolean().optional().default(true),
});

const flatIdParamSchema = z.object({
  flatId: z.string().uuid(),
});

const listFlatsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(120).optional(),
  is_active: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === "true")),
});

const createFlatTypeSchema = z.object({
  body: flatTypeBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const createFlatSchema = z.object({
  body: flatBodySchema,
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const updateFlatSchema = z.object({
  body: flatBodySchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, "Provide at least one field."),
  params: flatIdParamSchema,
  query: z.object({}).default({}),
});

const flatByIdSchema = z.object({
  body: z.object({}).default({}),
  params: flatIdParamSchema,
  query: z.object({}).default({}),
});

const listFlatsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: listFlatsQuerySchema,
});

const listFlatTypesSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export {
  createFlatTypeSchema,
  listFlatTypesSchema,
  createFlatSchema,
  listFlatsSchema,
  flatByIdSchema,
  updateFlatSchema,
};
