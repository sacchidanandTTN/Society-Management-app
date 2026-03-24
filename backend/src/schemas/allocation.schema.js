import { z } from "zod";

const createAllocationSchema = z.object({
  body: z.object({
    flat_id: z.string().uuid(),
    resident_id: z.string().uuid(),
    start_date: z.string().date().optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const allocationIdParamSchema = z.object({
  allocationId: z.string().uuid(),
});

const endAllocationSchema = z.object({
  body: z.object({
    end_date: z.string().date().optional(),
  }),
  params: allocationIdParamSchema,
  query: z.object({}).default({}),
});

export { createAllocationSchema, endAllocationSchema };
