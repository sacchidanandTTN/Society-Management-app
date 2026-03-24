import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import pool from "../../db/pool.js";
import { findFlatById } from "../../repositories/flat.repository.js";
import { findResidentById } from "../../repositories/resident.repository.js";
import { generateMonthlyRecords } from "../../services/monthly-record.service.js";
import {
  createAllocation,
  endAllocationById,
  getAllocationById,
  getCurrentAllocationByFlatId,
  getCurrentAllocationForResidentFlat,
} from "../../repositories/allocation.repository.js";

const createAllocationByAdmin = asyncHandler(async (req, res) => {
  const { flat_id, resident_id, start_date } = req.validated.body;

  const flat = await findFlatById(flat_id);
  if (!flat) {
    throw new ApiError(404, "Flat not found.");
  }
  if (!flat.is_active) {
    throw new ApiError(400, "Flat is inactive.");
  }

  const resident = await findResidentById(resident_id);
  if (!resident) {
    throw new ApiError(404, "Resident not found.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const curAlloc = await getCurrentAllocationByFlatId(flat_id, client);
    if (curAlloc && curAlloc.resident_id !== resident_id) {
      throw new ApiError(409, "Flat already has an active allocation. End it first.");
    }

    const sameAlloc = await getCurrentAllocationForResidentFlat(
      flat_id,
      resident_id,
      client
    );

    if (sameAlloc) {
      throw new ApiError(409, "Resident already has an active allocation for this flat.");
    }

    const allocation = await createAllocation(
      {
        flatId: flat_id,
        residentId: resident_id,
        startDate: start_date,
      },
      client
    );

    const gen = await generateMonthlyRecords({
      allocations: [
        {
          flat_id: flat.id,
          flat_number: flat.flat_number,
          flat_type_id: flat.flat_type_id,
          start_date: allocation.start_date,
        },
      ],
      dbClient: client,
    });

    await client.query("COMMIT");

    return res
      .status(201)
      .json(
        new ApiResponse(201, "Allocation created.", {
          allocation,
          monthly_records: {
            generated_count: gen.created.length,
            skipped_count: gen.skipped.length,
          },
        })
      );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const endAllocationByAdmin = asyncHandler(async (req, res) => {
  const { allocationId } = req.validated.params;
  const { end_date } = req.validated.body;

  const allocation = await getAllocationById(allocationId);
  if (!allocation) {
    throw new ApiError(404, "Allocation not found.");
  }

  if (!allocation.is_current) {
    return res
      .status(200)
      .json(new ApiResponse(200, "Allocation is already ended.", allocation));
  }

  const endedAllocation = await endAllocationById(allocationId, end_date);
  return res
    .status(200)
    .json(new ApiResponse(200, "Allocation ended.", endedAllocation));
});

export { createAllocationByAdmin, endAllocationByAdmin };
