import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import { resolveResidentFromToken } from "./user.controller.js";
import { processPayment } from "../../services/payment.service.js";

const payMySubscription = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);

  const monthlyRecordId = req.validated.body?.monthly_record_id;
  if (!monthlyRecordId) {
    throw new ApiError(400, "monthly_record_id is required.");
  }
  if (req.validated.body?.payment_mode !== "razorpay") {
    throw new ApiError(400, "Only razorpay is allowed.");
  }

  const result = await processPayment({
    payload: {
      monthly_record_id: monthlyRecordId,
      payment_mode: "razorpay",
    },
    residentId: resident.id,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Payment done.", result));
});

export { payMySubscription };
