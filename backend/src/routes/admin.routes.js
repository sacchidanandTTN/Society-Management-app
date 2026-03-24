import { Router } from "express";
import { checkJwt, requireRole } from "../middlewares/auth.middleware.js";
import validate from "../middlewares/validate.middleware.js";
import {
  createResidentSchema,
  listResidentsSchema,
  residentByIdSchema,
  updateResidentSchema,
} from "../schemas/resident.schema.js";
import {
  activateResidentByAdmin,
  createResidentByAdmin,
  deactivateResidentByAdmin,
  getResidentByIdByAdmin,
  getResidentsByAdmin,
  updateResidentByAdmin,
} from "../controllers/admin/resident.controller.js";
import {
  activateFlatByAdmin,
  createFlatByAdmin,
  createFlatTypeByAdmin,
  deactivateFlatByAdmin,
  getFlatByIdByAdmin,
  getFlatsByAdmin,
  getFlatTypesByAdmin,
  updateFlatByAdmin,
} from "../controllers/admin/flat.controller.js";
import {
  createFlatSchema,
  createFlatTypeSchema,
  flatByIdSchema,
  listFlatsSchema,
  listFlatTypesSchema,
  updateFlatSchema,
} from "../schemas/flat.schema.js";
import {
  createAllocationSchema,
  endAllocationSchema,
} from "../schemas/allocation.schema.js";
import {
  createAllocationByAdmin,
  endAllocationByAdmin,
} from "../controllers/admin/allocation.controller.js";
import {
  createSubscriptionPlanByAdmin,
  generateMonthlyRecordsByAdmin,
  getMonthlyRecordsByAdmin,
  getSubscriptionPlansByAdmin,
} from "../controllers/admin/subscription.controller.js";
import {
  createSubscriptionPlanSchema,
  generateMonthlyRecordsSchema,
  listMonthlyRecordsSchema,
  listSubscriptionPlansSchema,
} from "../schemas/subscription.schema.js";
import {
  createNotificationSchema,
  listNotificationsSchema,
} from "../schemas/notification.schema.js";
import {
  createNotificationByAdmin,
  getNotificationsByAdmin,
} from "../controllers/admin/notification.controller.js";
import {
  createPaymentSchema,
  listPaymentsSchema,
} from "../schemas/payment.schema.js";
import {
  createPaymentByAdmin,
  getPaymentsByAdmin,
} from "../controllers/admin/payment.controller.js";

const adminRouter = Router();

adminRouter.use(checkJwt, requireRole("admin"));

adminRouter.post("/residents", validate(createResidentSchema), createResidentByAdmin);
adminRouter.get("/residents", validate(listResidentsSchema), getResidentsByAdmin);
adminRouter.get(
  "/residents/:residentId",
  validate(residentByIdSchema),
  getResidentByIdByAdmin
);
adminRouter.patch(
  "/residents/:residentId",
  validate(updateResidentSchema),
  updateResidentByAdmin
);
adminRouter.patch(
  "/residents/:residentId/deactivate",
  validate(residentByIdSchema),
  deactivateResidentByAdmin
);
adminRouter.patch(
  "/residents/:residentId/activate",
  validate(residentByIdSchema),
  activateResidentByAdmin
);

adminRouter.post("/flat-types", validate(createFlatTypeSchema), createFlatTypeByAdmin);
adminRouter.get("/flat-types", validate(listFlatTypesSchema), getFlatTypesByAdmin);
adminRouter.post("/flats", validate(createFlatSchema), createFlatByAdmin);
adminRouter.get("/flats", validate(listFlatsSchema), getFlatsByAdmin);
adminRouter.get("/flats/:flatId", validate(flatByIdSchema), getFlatByIdByAdmin);
adminRouter.patch("/flats/:flatId", validate(updateFlatSchema), updateFlatByAdmin);
adminRouter.patch(
  "/flats/:flatId/deactivate",
  validate(flatByIdSchema),
  deactivateFlatByAdmin
);
adminRouter.patch("/flats/:flatId/activate", validate(flatByIdSchema), activateFlatByAdmin);
adminRouter.post(
  "/allocations",
  validate(createAllocationSchema),
  createAllocationByAdmin
);
adminRouter.patch(
  "/allocations/:allocationId/end",
  validate(endAllocationSchema),
  endAllocationByAdmin
);
adminRouter.post(
  "/subscription-plans",
  validate(createSubscriptionPlanSchema),
  createSubscriptionPlanByAdmin
);
adminRouter.get(
  "/subscription-plans",
  validate(listSubscriptionPlansSchema),
  getSubscriptionPlansByAdmin
);
adminRouter.post(
  "/monthly-records/generate",
  validate(generateMonthlyRecordsSchema),
  generateMonthlyRecordsByAdmin
);
adminRouter.get(
  "/monthly-records",
  validate(listMonthlyRecordsSchema),
  getMonthlyRecordsByAdmin
);
adminRouter.post(
  "/notifications",
  validate(createNotificationSchema),
  createNotificationByAdmin
);
adminRouter.get(
  "/notifications",
  validate(listNotificationsSchema),
  getNotificationsByAdmin
);
adminRouter.post("/payments", validate(createPaymentSchema), createPaymentByAdmin);
adminRouter.get("/payments", validate(listPaymentsSchema), getPaymentsByAdmin);

export default adminRouter;
