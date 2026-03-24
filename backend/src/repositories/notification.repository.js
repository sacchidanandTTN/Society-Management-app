import pool from "../db/pool.js";

const findAdminByAuth0Id = async (auth0Id) => {
  if (!auth0Id) return null;
  const result = await pool.query(
    `SELECT id, name, email, auth0_id, role
     FROM admins
     WHERE auth0_id = $1`,
    [auth0Id]
  );

  return result.rows[0] || null;
};

const createNotification = async ({ title, message, sent_by_admin_id }, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `INSERT INTO notifications (id, title, message, sent_by_admin_id, created_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW())
     RETURNING id, title, message, sent_by_admin_id, created_at`,
    [title, message, sent_by_admin_id || null]
  );

  return result.rows[0];
};

const listResidentIdsWithActiveAllocations = async (db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT DISTINCT fr.resident_id AS id
     FROM flat_residents fr
     WHERE fr.is_current = true`
  );
  return result.rows.map((row) => row.id);
};

const listExistingResidentIds = async (residentIds, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id
     FROM residents
     WHERE id = ANY($1::uuid[])`,
    [residentIds]
  );
  return result.rows.map((row) => row.id);
};

const createUserNotifications = async (notificationId, residentIds, db = null) => {
  if (!residentIds.length) return 0;
  const executor = db || pool;
  const result = await executor.query(
    `INSERT INTO user_notifications (id, resident_id, notification_id, is_read, created_at)
     SELECT gen_random_uuid(), resident_id, $1, false, NOW()
     FROM unnest($2::uuid[]) AS resident_id
     ON CONFLICT (resident_id, notification_id) DO NOTHING`,
    [notificationId, residentIds]
  );

  return result.rowCount || 0;
};

const listNotifications = async () => {
  const dataResult = await pool.query(
    `SELECT
       n.id,
       n.title,
       n.message,
       n.sent_by_admin_id,
       n.created_at,
       COUNT(un.id)::int AS recipients_count
     FROM notifications n
     LEFT JOIN user_notifications un ON un.notification_id = n.id
     GROUP BY n.id
     ORDER BY n.created_at DESC
     LIMIT 20`
  );

  return dataResult.rows;
};

export {
  findAdminByAuth0Id,
  createNotification,
  listResidentIdsWithActiveAllocations,
  listExistingResidentIds,
  createUserNotifications,
  listNotifications,
};
