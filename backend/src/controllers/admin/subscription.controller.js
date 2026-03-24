import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import pool from "../../db/pool.js";
import { ensureMonthlyRecords } from "../../services/monthly-record.service.js";
import {
  createSubscriptionPlan,
  findFlatTypeById,
  findPlanForFlatTypeOnDate,
  insertMonthlyRecord,
  listActiveAllocatedFlatsForMonth,
  listMonthlyRecords,
  listSubscriptionPlans,
} from "../../repositories/subscription.repository.js";

const createSubscriptionPlanByAdmin = asyncHandler(async (req, res) => {
  const payload = req.validated.body;

  const flatType = await findFlatTypeById(payload.flat_type_id);
  if (!flatType) {
    throw new ApiError(404, "Flat type not found.");
  }

  try {
    const plan = await createSubscriptionPlan(payload);
    return res
      .status(201)
      .json(new ApiResponse(201, "Plan created.", plan));
  } catch (error) {
    if (error?.code === "23505") {
      throw new ApiError(
        409,
        "Plan already exists for this date."
      );
    }
    throw error;
  }
});

const getSubscriptionPlansByAdmin = asyncHandler(async (req, res) => {
  const plans = await listSubscriptionPlans(req.validated.query);
  return res
    .status(200)
    .json(new ApiResponse(200, "Plans fetched.", plans));
});

const formatMonthDate = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const generateMonthlyRecordsForPeriod = async ({ month, year, dueDate, flats, client }) => {
  const referenceDate = formatMonthDate(year, month, 1);
  const created = [];
  const skipped = [];

  for (const flat of flats) {
    const plan = await findPlanForFlatTypeOnDate(flat.flat_type_id, referenceDate, client);
    if (!plan) {
      skipped.push({
        flat_id: flat.id,
        flat_number: flat.flat_number,
        reason: "No applicable subscription plan found.",
      });
      continue;
    }

    const inserted = await insertMonthlyRecord(
      {
        flat_id: flat.id,
        month,
        year,
        amount: plan.monthly_amount,
        status: "pending",
        due_date: dueDate,
      },
      client
    );

    if (inserted) {
      created.push(inserted);
    } else {
      skipped.push({
        flat_id: flat.id,
        flat_number: flat.flat_number,
        reason: "Monthly record already exists for this period.",
      });
    }
  }

  return { created, skipped };
};

const generateMonthlyRecordsByAdmin = asyncHandler(async (req, res) => {
  const { month, year, due_date } = req.validated.body;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    throw new ApiError(400, "Cannot generate for future month.");
  }
  const dueDate = due_date || formatMonthDate(year, month, 15);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const activeFlats = await listActiveAllocatedFlatsForMonth(year, month, client);
    const { created, skipped } = await generateMonthlyRecordsForPeriod({
      month,
      year,
      dueDate,
      flats: activeFlats,
      client,
    });

    await client.query("COMMIT");

    return res.status(200).json(
      new ApiResponse(200, "Monthly records generated.", {
        month,
        year,
        due_date: dueDate,
        created_count: created.length,
        skipped_count: skipped.length,
        created,
        skipped,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const getMonthlyRecordsByAdmin = asyncHandler(async (req, res) => {
  const { page, limit, month, year, flat_id, status } = req.validated.query;
  const offset = (page - 1) * limit;

  await ensureMonthlyRecords();

  const result = await listMonthlyRecords({
    month,
    year,
    flat_id,
    status,
    limit,
    offset,
  });

  return res.status(200).json(
    new ApiResponse(200, "Monthly records fetched.", {
      items: result.rows,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    })
  );
});

export {
  createSubscriptionPlanByAdmin,
  getSubscriptionPlansByAdmin,
  generateMonthlyRecordsByAdmin,
  getMonthlyRecordsByAdmin,
};
