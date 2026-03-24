import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import pool from "../../db/pool.js";
import {
  createNotification,
  createUserNotifications,
  findAdminByAuth0Id,
  listResidentIdsWithActiveAllocations,
  listExistingResidentIds,
  listNotifications,
} from "../../repositories/notification.repository.js";
import { sendPushNotification } from "../../services/push-notification.service.js";

const createNotificationByAdmin = asyncHandler(async (req, res) => {
  const { title, message, resident_ids = [] } = req.validated.body;
  const dedupResidentIds = [...new Set(resident_ids)];

  const auth0Sub = req.auth?.payload?.sub;
  const admin = await findAdminByAuth0Id(auth0Sub);
  const sentByAdminId = admin?.id || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const notification = await createNotification(
      {
        title,
        message,
        sent_by_admin_id: sentByAdminId,
      },
      client
    );

    let targetResidentIds = dedupResidentIds;
    if (!targetResidentIds.length) {
      targetResidentIds = await listResidentIdsWithActiveAllocations(client);
    } else {
      const existingResidents = await listExistingResidentIds(targetResidentIds, client);
      if (existingResidents.length !== targetResidentIds.length) {
        throw new ApiError(400, "One or more resident_ids are invalid.");
      }
      targetResidentIds = existingResidents;
    }

    const insertedCount = await createUserNotifications(
      notification.id,
      targetResidentIds,
      client
    );

    await client.query("COMMIT");

    let pushResult = null;
    try {
      pushResult = await sendPushNotification({
        title,
        message,
        residentIds: targetResidentIds,
      });
    } catch (error) {
      pushResult = {
        sent: false,
        reason: "push_delivery_failed",
        detail: error?.message || "Push delivery failed.",
      };
    }

    return res.status(201).json(
      new ApiResponse(201, "Notification sent.", {
        notification,
        recipients_count: insertedCount,
        push: pushResult,
      })
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
});

const getNotificationsByAdmin = asyncHandler(async (req, res) => {
  const items = await listNotifications();

  return res.status(200).json(
    new ApiResponse(200, "Notifications fetched.", {
      items,
    })
  );
});

export {
  createNotificationByAdmin,
  getNotificationsByAdmin,
};
