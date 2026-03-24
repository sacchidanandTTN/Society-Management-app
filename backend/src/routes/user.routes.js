import { Router } from "express";
import { checkJwt, requireRole } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
  emptySchema,
  listMyMonthlyRecordsSchema,
  listMyNotificationsSchema,
  listMyPaymentsSchema,
  markNotificationReadSchema,
  changeMyPasswordSchema,
  updateMyProfileSchema,
} from "../schemas/user.schema.js";
import {
  changeMyPassword,
  getMyDashboard,
  getMyMonthlyRecords,
  getMyNotifications,
  getMyPayments,
  getMyProfile,
  markMyNotificationRead,
  updateMyProfile,
} from "../controllers/user/user.controller.js";
import { createPaymentSchema } from "../schemas/payment.schema.js";
import { payMySubscription } from "../controllers/user/payment.controller.js";

const userRouter = Router();

userRouter.use(checkJwt, requireRole("user", "admin"));

userRouter.get("/dashboard", getMyDashboard);
userRouter.get(
  "/monthly-records",
  validate(listMyMonthlyRecordsSchema),
  getMyMonthlyRecords
);
userRouter.get("/payments", validate(listMyPaymentsSchema), getMyPayments);
userRouter.post("/payments/pay", validate(createPaymentSchema), payMySubscription);
userRouter.get("/notifications", validate(listMyNotificationsSchema), getMyNotifications);
userRouter.patch(
  "/notifications/:userNotificationId/read",
  validate(markNotificationReadSchema),
  markMyNotificationRead
);
userRouter.get("/profile", validate(emptySchema), getMyProfile);
userRouter.patch("/profile", validate(updateMyProfileSchema), updateMyProfile);
userRouter.patch("/profile/password", validate(changeMyPasswordSchema), changeMyPassword);

export default userRouter;
