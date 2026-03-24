import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import pool from "../../db/pool.js";
import {
  activateFlatById,
  createFlat,
  createFlatType,
  deactivateFlatById,
  findFlatById,
  findFlatTypeById,
  listFlats,
  listFlatTypes,
  updateFlatById,
} from "../../repositories/flat.repository.js";
import {
  endAllocationById,
  getCurrentAllocationByFlatId,
} from "../../repositories/allocation.repository.js";

const handlePgError = (error) => {
  if (error?.code === "23505") {
    throw new ApiError(409, "Flat number already exists.");
  }
  throw error;
};

const createFlatTypeByAdmin = asyncHandler(async (req, res) => {
  const flatType = await createFlatType(req.validated.body);

  return res
    .status(201)
    .json(new ApiResponse(201, "Flat type created.", flatType));
});

const getFlatTypesByAdmin = asyncHandler(async (req, res) => {
  const items = await listFlatTypes();
  return res
    .status(200)
    .json(new ApiResponse(200, "Flat types fetched.", items));
});

const createFlatByAdmin = asyncHandler(async (req, res) => {
  const payload = req.validated.body;
  const flatType = await findFlatTypeById(payload.flat_type_id);
  if (!flatType) {
    throw new ApiError(404, "Flat type not found.");
  }

  try {
    const flat = await createFlat(payload);
    return res
      .status(201)
      .json(new ApiResponse(201, "Flat created.", flat));
  } catch (error) {
    handlePgError(error);
  }
});

const getFlatsByAdmin = asyncHandler(async (req, res) => {
  const { page, limit, search, is_active } = req.validated.query;
  const offset = (page - 1) * limit;
  const result = await listFlats({ search, is_active, limit, offset });

  return res.status(200).json(
    new ApiResponse(200, "Flats fetched.", {
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

const getFlatByIdByAdmin = asyncHandler(async (req, res) => {
  const { flatId } = req.validated.params;
  const flat = await findFlatById(flatId);
  if (!flat) {
    throw new ApiError(404, "Flat not found.");
  }

  return res.status(200).json(new ApiResponse(200, "Flat fetched.", flat));
});

const updateFlatByAdmin = asyncHandler(async (req, res) => {
  const { flatId } = req.validated.params;
  const payload = req.validated.body;

  const existingFlat = await findFlatById(flatId);
  if (!existingFlat) {
    throw new ApiError(404, "Flat not found.");
  }

  if (payload.flat_type_id) {
    const flatType = await findFlatTypeById(payload.flat_type_id);
    if (!flatType) {
      throw new ApiError(404, "Flat type not found.");
    }
  }

  try {
    const updatedFlat = await updateFlatById(flatId, payload);
    return res
      .status(200)
      .json(new ApiResponse(200, "Flat updated.", updatedFlat));
  } catch (error) {
    handlePgError(error);
  }
});

const deactivateFlatByAdmin = asyncHandler(async (req, res) => {
  const { flatId } = req.validated.params;

  const existingFlat = await findFlatById(flatId);
  if (!existingFlat) {
    throw new ApiError(404, "Flat not found.");
  }

  if (!existingFlat.is_active) {
    return res
      .status(200)
      .json(new ApiResponse(200, "Flat is already inactive.", existingFlat));
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentAllocation = await getCurrentAllocationByFlatId(flatId, client);

    if (currentAllocation) {
      const pendingDueResult = await client.query(
        `SELECT
           COUNT(*)::int AS pending_count,
           COALESCE(SUM(amount), 0)::numeric AS pending_amount
         FROM monthly_records
         WHERE flat_id = $1
           AND status = 'pending'
           AND make_date(year, month, 1) >= date_trunc('month', $2::date)::date
           AND make_date(year, month, 1) <= date_trunc('month', CURRENT_DATE)::date`,
        [flatId, currentAllocation.start_date]
      );

      const pendingCount = pendingDueResult.rows[0]?.pending_count || 0;
      const pendingAmount = Number(pendingDueResult.rows[0]?.pending_amount || 0);

      if (pendingCount > 0) {
        throw new ApiError(
          409,
          `Cannot deactivate flat. Pending dues: ${pendingCount} record(s), total ${pendingAmount.toFixed(
            2
          )}.`
        );
      }

      await endAllocationById(currentAllocation.id, null, client);
    }

    const deactivatedFlat = await deactivateFlatById(flatId, client);
    await client.query("COMMIT");

    return res.status(200).json(
      new ApiResponse(200, "Flat deactivated.", {
        ...deactivatedFlat,
        allocation_ended: Boolean(currentAllocation),
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const activateFlatByAdmin = asyncHandler(async (req, res) => {
  const { flatId } = req.validated.params;

  const existingFlat = await findFlatById(flatId);
  if (!existingFlat) {
    throw new ApiError(404, "Flat not found.");
  }

  if (existingFlat.is_active) {
    return res
      .status(200)
      .json(new ApiResponse(200, "Flat is already active.", existingFlat));
  }

  const activatedFlat = await activateFlatById(flatId);
  return res
    .status(200)
    .json(new ApiResponse(200, "Flat activated.", activatedFlat));
});

export {
  createFlatTypeByAdmin,
  getFlatTypesByAdmin,
  createFlatByAdmin,
  getFlatsByAdmin,
  getFlatByIdByAdmin,
  updateFlatByAdmin,
  deactivateFlatByAdmin,
  activateFlatByAdmin,
};
