import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import {
  changeAuth0UserPassword,
  getAuth0UserById,
} from "../../services/auth0-management.service.js";
import { ensureMonthlyRecords } from "../../services/monthly-record.service.js";
import {
  findResidentByAuth0Id,
  findResidentByEmail,
  getUserDashboardStats,
  linkResidentAuth0IdById,
  listMyMonthlyRecords,
  listMyNotifications,
  listMyPayments,
  markMyNotificationAsRead,
  updateResidentProfileById,
} from "../../repositories/user.repository.js";

const resolveResidentFromToken = async (req) => {
  const payload = req.auth?.payload || {};
  const auth0Id = payload.sub;
  if (!auth0Id) {
    throw new ApiError(401, "Unauthorized.");
  }

  let resident = await findResidentByAuth0Id(auth0Id);

  if (!resident) {
    const email = typeof payload.email === "string" ? payload.email.trim() : "";
    if (email) {
      const residentByEmail = await findResidentByEmail(email);
      if (residentByEmail) {
        if (residentByEmail.auth0_id && residentByEmail.auth0_id !== auth0Id) {
          throw new ApiError(403, "Resident email is linked to another account.");
        }
        resident =
          residentByEmail.auth0_id === auth0Id
            ? residentByEmail
            : await linkResidentAuth0IdById(residentByEmail.id, auth0Id);
      }
    }
  }

  if (!resident) {
    throw new ApiError(404, "Resident not found.");
  }

  try {
    const auth0User = await getAuth0UserById(auth0Id);
    if (auth0User?.blocked) {
      throw new ApiError(403, "Resident is deactivated.");
    }
  } catch (error) {
    if (error?.statusCode === 403) {
      throw error;
    }
    // keep user APIs working on temporary Auth0 Management limits/timeouts
  }

  return resident;
};

const getMyDashboard = asyncHandler(async (req, res) => {
  await ensureMonthlyRecords();
  const resident = await resolveResidentFromToken(req);
  const stats = await getUserDashboardStats(resident.id);

  return res.status(200).json(
    new ApiResponse(200, "Dashboard fetched.", {
      resident: {
        id: resident.id,
        name: resident.name,
        email: resident.email,
      },
      stats,
    })
  );
});

const getMyMonthlyRecords = asyncHandler(async (req, res) => {
  await ensureMonthlyRecords();
  const resident = await resolveResidentFromToken(req);
  const { page, limit, month, year, status } = req.validated.query;
  const offset = (page - 1) * limit;

  const result = await listMyMonthlyRecords({
    residentId: resident.id,
    month,
    year,
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

const getMyPayments = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);
  const { page, limit, payment_status } = req.validated.query;
  const offset = (page - 1) * limit;

  const result = await listMyPayments({
    residentId: resident.id,
    payment_status,
    limit,
    offset,
  });

  return res.status(200).json(
    new ApiResponse(200, "Payments fetched.", {
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

const getMyNotifications = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);
  const { page, limit, is_read } = req.validated.query;
  const offset = (page - 1) * limit;

  const result = await listMyNotifications({
    residentId: resident.id,
    is_read,
    limit,
    offset,
  });

  return res.status(200).json(
    new ApiResponse(200, "Notifications fetched.", {
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

const markMyNotificationRead = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);
  const { userNotificationId } = req.validated.params;

  const updated = await markMyNotificationAsRead(resident.id, userNotificationId);
  if (!updated) {
    throw new ApiError(404, "Notification record not found.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Notification updated.", updated));
});

const getMyProfile = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);
  return res
    .status(200)
    .json(new ApiResponse(200, "Profile fetched.", resident));
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);
  const updated = await updateResidentProfileById(resident.id, req.validated.body);
  return res
    .status(200)
    .json(new ApiResponse(200, "Profile updated.", updated));
});

const changeMyPassword = asyncHandler(async (req, res) => {
  const resident = await resolveResidentFromToken(req);
  const { new_password: newPassword } = req.validated.body;

  if (!resident.auth0_id) {
    throw new ApiError(400, "Auth0 is not linked.");
  }

  await changeAuth0UserPassword(resident.auth0_id, newPassword);

  return res.status(200).json(
    new ApiResponse(200, "Password changed.", {
      residentId: resident.id,
    })
  );
});

export {
  resolveResidentFromToken,
  getMyDashboard,
  getMyMonthlyRecords,
  getMyPayments,
  getMyNotifications,
  markMyNotificationRead,
  getMyProfile,
  updateMyProfile,
  changeMyPassword,
};
