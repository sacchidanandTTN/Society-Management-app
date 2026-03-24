import { z } from "zod";

const indianPhoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, "Phone must be exactly 10 digits.")
  .regex(/^[6-9]/, "Phone must start with 6, 7, 8, or 9.")
  .refine((value) => !/^(\d)\1{9}$/.test(value), "Phone cannot have all digits same.");

const listMyMonthlyRecordsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    status: z.enum(["pending", "paid"]).optional(),
  }),
});

const listMyPaymentsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    payment_status: z.enum(["pending", "completed", "failed"]).optional(),
  }),
});

const listMyNotificationsSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    is_read: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === "true")),
  }),
});

const markNotificationReadSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({
    userNotificationId: z.string().uuid(),
  }),
  query: z.object({}).default({}),
});

const updateMyProfileSchema = z.object({
  body: z.object({
    phone: indianPhoneSchema,
  }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const changeMyPasswordSchema = z.object({
  body: z
    .object({
      new_password: z
        .string()
        .min(8, "Password must be at least 8 characters.")
        .max(72, "Password must be at most 72 characters.")
        .regex(/[A-Z]/, "Password must include at least one uppercase letter.")
        .regex(/[a-z]/, "Password must include at least one lowercase letter.")
        .regex(/[0-9]/, "Password must include at least one number.")
        .regex(/[^A-Za-z0-9]/, "Password must include at least one special character."),
      confirm_password: z.string(),
    })
    .refine((value) => value.new_password === value.confirm_password, {
      message: "Passwords do not match.",
      path: ["confirm_password"],
    }),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

const emptySchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({}).default({}),
});

export {
  listMyMonthlyRecordsSchema,
  listMyPaymentsSchema,
  listMyNotificationsSchema,
  markNotificationReadSchema,
  updateMyProfileSchema,
  changeMyPasswordSchema,
  emptySchema,
};
