import pool from "../db/pool.js";

const findResidentByAuth0Id = async (auth0Id) => {
  const result = await pool.query(
    `SELECT id, name, email, phone, auth0_id, created_at, updated_at
     FROM residents
     WHERE auth0_id = $1`,
    [auth0Id]
  );

  return result.rows[0] || null;
};

const findResidentByEmail = async (email) => {
  const result = await pool.query(
    `SELECT id, name, email, phone, auth0_id, created_at, updated_at
     FROM residents
     WHERE LOWER(email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] || null;
};

const linkResidentAuth0IdById = async (residentId, auth0Id) => {
  const result = await pool.query(
    `UPDATE residents
     SET auth0_id = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, phone, auth0_id, created_at, updated_at`,
    [auth0Id, residentId]
  );

  return result.rows[0] || null;
};

const listMyMonthlyRecords = async ({ residentId, month, year, status, limit, offset }) => {
  const values = [residentId];
  const filters = [];

  if (month !== undefined) {
    values.push(month);
    filters.push(`mr.month = $${values.length}`);
  }
  if (year !== undefined) {
    values.push(year);
    filters.push(`mr.year = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`mr.status = $${values.length}`);
  }

  const dynamicWhere = filters.length ? `AND ${filters.join(" AND ")}` : "";
  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const dataResult = await pool.query(
    `SELECT DISTINCT
       mr.id,
       mr.flat_id,
       f.flat_number,
       mr.month,
       mr.year,
       mr.amount,
       mr.status,
       mr.due_date,
       mr.created_at,
       mr.updated_at
     FROM monthly_records mr
     JOIN flats f ON f.id = mr.flat_id
     JOIN flat_residents fr ON fr.flat_id = mr.flat_id
     WHERE fr.resident_id = $1
       AND make_date(mr.year, mr.month, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date(mr.year, mr.month, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
       ${dynamicWhere}
     ORDER BY mr.year DESC, mr.month DESC, f.flat_number ASC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const countValues = values.slice(0, values.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT mr.id)::int AS total
     FROM monthly_records mr
     JOIN flat_residents fr ON fr.flat_id = mr.flat_id
     WHERE fr.resident_id = $1
       AND make_date(mr.year, mr.month, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date(mr.year, mr.month, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
       ${dynamicWhere}`,
    countValues
  );

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

const listMyPayments = async ({ residentId, payment_status, limit, offset }) => {
  const values = [residentId];
  const filters = [];

  if (payment_status) {
    values.push(payment_status);
    filters.push(`p.payment_status = $${values.length}`);
  }

  const dynamicWhere = filters.length ? `AND ${filters.join(" AND ")}` : "";
  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const dataResult = await pool.query(
    `SELECT DISTINCT
       p.id,
       p.monthly_record_id,
       p.amount,
       p.payment_mode,
       p.payment_status,
       p.transaction_id,
       p.payment_date,
       p.created_at,
       mr.flat_id,
       f.flat_number,
       mr.month,
       mr.year
     FROM payments p
     JOIN monthly_records mr ON mr.id = p.monthly_record_id
     JOIN flats f ON f.id = mr.flat_id
     JOIN flat_residents fr ON fr.flat_id = mr.flat_id
     WHERE fr.resident_id = $1
       AND make_date(mr.year, mr.month, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date(mr.year, mr.month, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
       ${dynamicWhere}
     ORDER BY p.payment_date DESC NULLS LAST, p.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const countValues = values.slice(0, values.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(DISTINCT p.id)::int AS total
     FROM payments p
     JOIN monthly_records mr ON mr.id = p.monthly_record_id
     JOIN flat_residents fr ON fr.flat_id = mr.flat_id
     WHERE fr.resident_id = $1
       AND make_date(mr.year, mr.month, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date(mr.year, mr.month, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
       ${dynamicWhere}`,
    countValues
  );

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

const listMyNotifications = async ({ residentId, is_read, limit, offset }) => {
  const values = [residentId];
  const filters = [];
  if (is_read !== undefined) {
    values.push(is_read);
    filters.push(`un.is_read = $${values.length}`);
  }

  const dynamicWhere = filters.length ? `AND ${filters.join(" AND ")}` : "";
  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const dataResult = await pool.query(
    `SELECT
       un.id AS user_notification_id,
       un.is_read,
       un.created_at AS received_at,
       n.id AS notification_id,
       n.title,
       n.message,
       n.created_at
     FROM user_notifications un
     JOIN notifications n ON n.id = un.notification_id
     WHERE un.resident_id = $1
       ${dynamicWhere}
     ORDER BY n.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const countValues = values.slice(0, values.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM user_notifications un
     WHERE un.resident_id = $1
       ${dynamicWhere}`,
    countValues
  );

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

const markMyNotificationAsRead = async (residentId, userNotificationId) => {
  const result = await pool.query(
    `UPDATE user_notifications
     SET is_read = true
     WHERE id = $1 AND resident_id = $2
     RETURNING id, resident_id, notification_id, is_read, created_at`,
    [userNotificationId, residentId]
  );

  return result.rows[0] || null;
};

const updateResidentProfileById = async (residentId, payload) => {
  const result = await pool.query(
    `UPDATE residents
     SET phone = $1, updated_at = NOW()
     WHERE id = $2
     RETURNING id, name, email, phone, auth0_id, created_at, updated_at`,
    [payload.phone, residentId]
  );

  return result.rows[0] || null;
};

const getUserDashboardStats = async (residentId) => {
  const summary = await pool.query(
    `SELECT
       COUNT(*)::int AS total_monthly_records,
       COUNT(CASE WHEN mr.status = 'pending' THEN 1 END)::int AS pending_records,
       COUNT(CASE WHEN mr.status = 'paid' THEN 1 END)::int AS paid_records,
       COALESCE(SUM(CASE WHEN mr.status = 'pending' THEN mr.amount END), 0)::numeric AS pending_amount
     FROM monthly_records mr
     WHERE EXISTS (
       SELECT 1
       FROM flat_residents fr
       WHERE fr.flat_id = mr.flat_id
         AND fr.resident_id = $1
         AND make_date(mr.year, mr.month, 1) >= date_trunc('month', fr.start_date)::date
         AND make_date(mr.year, mr.month, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
     )`,
    [residentId]
  );

  const unread = await pool.query(
    `SELECT COUNT(*)::int AS unread_notifications
     FROM user_notifications
     WHERE resident_id = $1 AND is_read = false`,
    [residentId]
  );

  return {
    ...summary.rows[0],
    unread_notifications: unread.rows[0]?.unread_notifications || 0,
  };
};

export {
  findResidentByAuth0Id,
  findResidentByEmail,
  linkResidentAuth0IdById,
  listMyMonthlyRecords,
  listMyPayments,
  listMyNotifications,
  markMyNotificationAsRead,
  updateResidentProfileById,
  getUserDashboardStats,
};
