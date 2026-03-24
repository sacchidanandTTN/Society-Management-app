import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import {
  findAdminByAuth0Id,
  listPayments,
} from "../../repositories/payment.repository.js";
import { processPayment } from "../../services/payment.service.js";

const createPaymentByAdmin = asyncHandler(async (req, res) => {
  const sub = req.auth?.payload?.sub;
  const adm = await findAdminByAuth0Id(sub);
  const data = await processPayment({
    payload: req.validated.body,
    recordedByAdminId: adm?.id || null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Payment done.", data));
});

const getPaymentsByAdmin = asyncHandler(async (req, res) => {
  const { page, limit, payment_status, month, year, payment_month, payment_year, flat_id } =
    req.validated.query;
  const offset = (page - 1) * limit;
  const data = await listPayments({
    payment_status,
    month,
    year,
    payment_month,
    payment_year,
    flat_id,
    limit,
    offset,
  });

  return res.status(200).json(
    new ApiResponse(200, "Payments fetched.", {
      items: data.rows,
      pagination: {
        page,
        limit,
        total: data.total,
        totalPages: Math.ceil(data.total / limit) || 1,
      },
    })
  );
});

export { createPaymentByAdmin, getPaymentsByAdmin };
