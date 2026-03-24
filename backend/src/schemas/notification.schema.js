import { z } from "zod";

const createNotificationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(2).max(150),
    message: z.string().trim().min(2).max(2000),
    resident_ids: z.array(z.string().uuid()).optional(),
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const listNotificationsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export {
  createNotificationSchema,
  listNotificationsSchema,
};
