import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import {
  blockAuth0ResidentUser,
  createAuth0ResidentUser,
  deleteAuth0ResidentUser,
  getAuth0UserById,
  unblockAuth0ResidentUser,
  updateAuth0ResidentUser,
} from "../../services/auth0-management.service.js";
import {
  closeCurrentAllocationsByResident,
  createResident,
  findResidentByEmail,
  findResidentById,
  getResidentDeactivationGuardData,
  isAdminLinkedResident,
  listResidents,
  updateResidentById,
} from "../../repositories/resident.repository.js";

const createResidentByAdmin = asyncHandler(async (req, res) => {
  const { body } = req.validated;
  const existingResident = await findResidentByEmail(body.email);
  if (existingResident) {
    throw new ApiError(409, "Email already exists.");
  }

  let createdAuth0User = null;
  try {
    createdAuth0User = await createAuth0ResidentUser({
      name: body.name,
      email: body.email,
      password: body.password,
    });
    const resident = await createResident({
      name: body.name,
      email: body.email,
      phone: body.phone,
      auth0Id: createdAuth0User.user_id,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, "Resident created.", resident));
  } catch (error) {
    if (createdAuth0User?.user_id) {
      try {
        await deleteAuth0ResidentUser(createdAuth0User.user_id);
      } catch {}
    }
    throw error;
  }
});

const getResidentsByAdmin = asyncHandler(async (req, res) => {
  const { page, limit, search } = req.validated.query;
  const offset = (page - 1) * limit;
  const result = await listResidents({ search, limit, offset });
  const residentsWithStatus = await Promise.all(
    result.rows.map(async (resident) => {
      try {
        const auth0User = await getAuth0UserById(resident.auth0_id);
        return {
          ...resident,
          is_active: !auth0User?.blocked,
        };
      } catch {
        return {
          ...resident,
          is_active: true,
        };
      }
    })
  );

  return res.status(200).json(
    new ApiResponse(200, "Residents fetched.", {
      items: residentsWithStatus,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit) || 1,
      },
    })
  );
});

const getResidentByIdByAdmin = asyncHandler(async (req, res) => {
  const { residentId } = req.validated.params;
  const resident = await findResidentById(residentId);
  if (!resident) {
    throw new ApiError(404, "Resident not found.");
  }

  let isActive = true;
  try {
    const auth0User = await getAuth0UserById(resident.auth0_id);
    isActive = !auth0User?.blocked;
  } catch {}

  return res.status(200).json(
    new ApiResponse(200, "Resident fetched.", {
      ...resident,
      is_active: isActive,
    })
  );
});

const updateResidentByAdmin = asyncHandler(async (req, res) => {
  const { residentId } = req.validated.params;
  const payload = req.validated.body;

  const resident = await findResidentById(residentId);
  if (!resident) {
    throw new ApiError(404, "Resident not found.");
  }

  if (payload.email && payload.email !== resident.email) {
    const duplicateResident = await findResidentByEmail(payload.email);
    if (duplicateResident && duplicateResident.id !== residentId) {
      throw new ApiError(409, "Email already exists.");
    }
  }

  const updatedResident = await updateResidentById(residentId, payload);
  await updateAuth0ResidentUser(resident.auth0_id, payload);

  return res
    .status(200)
    .json(new ApiResponse(200, "Resident updated.", updatedResident));
});

const deactivateResidentByAdmin = asyncHandler(async (req, res) => {
  const { residentId } = req.validated.params;
  const resident = await findResidentById(residentId);

  if (!resident) {
    throw new ApiError(404, "Resident not found.");
  }
  if (await isAdminLinkedResident(resident.auth0_id)) {
    throw new ApiError(403, "Admin-linked account cannot be deactivated here.");
  }

  const guardData = await getResidentDeactivationGuardData(residentId);
  const hasActiveAllocation = Number(guardData.active_allocations || 0) > 0;
  const hasPendingDues = Number(guardData.pending_due_records || 0) > 0;

  if (hasActiveAllocation && hasPendingDues) {
    throw new ApiError(
      409,
      "Resident has pending dues. Clear dues first."
    );
  }

  if (hasActiveAllocation) {
    await closeCurrentAllocationsByResident(residentId);
  }

  await blockAuth0ResidentUser(resident.auth0_id);

  const message = hasActiveAllocation
    ? "Resident deactivated. Allocation closed."
    : "Resident deactivated.";

  return res.status(200).json(
    new ApiResponse(200, message, {
      residentId,
      is_active: false,
      deactivation_guard: {
        active_allocations: Number(guardData.active_allocations || 0),
        pending_due_records: Number(guardData.pending_due_records || 0),
        pending_due_amount: guardData.pending_due_amount || 0,
      },
    })
  );
});

const activateResidentByAdmin = asyncHandler(async (req, res) => {
  const { residentId } = req.validated.params;
  const resident = await findResidentById(residentId);

  if (!resident) {
    throw new ApiError(404, "Resident not found.");
  }
  if (await isAdminLinkedResident(resident.auth0_id)) {
    throw new ApiError(403, "Admin-linked account cannot be activated here.");
  }

  await unblockAuth0ResidentUser(resident.auth0_id);

  return res.status(200).json(
    new ApiResponse(200, "Resident activated.", {
      residentId,
      is_active: true,
    })
  );
});

export {
  createResidentByAdmin,
  getResidentsByAdmin,
  getResidentByIdByAdmin,
  updateResidentByAdmin,
  deactivateResidentByAdmin,
  activateResidentByAdmin,
};
