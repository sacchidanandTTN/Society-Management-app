import pool from "../db/pool.js";

const findMonthlyRecordById = async (monthlyRecordId, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id, flat_id, month, year, amount, status, due_date
     FROM monthly_records
     WHERE id = $1`,
    [monthlyRecordId]
  );

  return result.rows[0] || null;
};

const findMonthlyRecordByFlatPeriod = async (flatId, month, year, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id, flat_id, month, year, amount, status, due_date
     FROM monthly_records
     WHERE flat_id = $1 AND month = $2 AND year = $3`,
    [flatId, month, year]
  );

  return result.rows[0] || null;
};

const findApplicablePlanAmountForFlat = async (flatId, referenceDate, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT sp.monthly_amount
     FROM flats f
     JOIN subscription_plans sp ON sp.flat_type_id = f.flat_type_id
     WHERE f.id = $1
       AND sp.effective_from <= $2::date
     ORDER BY sp.effective_from DESC
     LIMIT 1`,
    [flatId, referenceDate]
  );

  return result.rows[0]?.monthly_amount ?? null;
};

const createMonthlyRecord = async (
  { flatId, month, year, amount, dueDate, status = "pending" },
  db = null
) => {
  const executor = db || pool;
  const result = await executor.query(
    `INSERT INTO monthly_records
      (id, flat_id, month, year, amount, status, due_date, created_at, updated_at)
     VALUES
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6::date, NOW(), NOW())
     ON CONFLICT (flat_id, month, year) DO NOTHING
     RETURNING id, flat_id, month, year, amount, status, due_date`,
    [flatId, month, year, amount, status, dueDate]
  );

  return result.rows[0] || null;
};

const findCompletedPaymentByMonthlyRecordId = async (monthlyRecordId, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id, monthly_record_id, payment_status, transaction_id
     FROM payments
     WHERE monthly_record_id = $1 AND payment_status = 'completed'
     LIMIT 1`,
    [monthlyRecordId]
  );

  return result.rows[0] || null;
};

const createPayment = async (
  { monthlyRecordId, amount, paymentMode, paymentStatus, transactionId, recordedByAdminId },
  db = null
) => {
  const executor = db || pool;
  const result = await executor.query(
    `INSERT INTO payments
      (id, monthly_record_id, amount, payment_mode, payment_status, transaction_id, payment_date, recorded_by_admin_id, created_at)
     VALUES
      (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), $6, NOW())
     RETURNING id, monthly_record_id, amount, payment_mode, payment_status, transaction_id, payment_date, recorded_by_admin_id, created_at`,
    [monthlyRecordId, amount, paymentMode, paymentStatus, transactionId, recordedByAdminId]
  );

  return result.rows[0];
};

const markMonthlyRecordPaid = async (monthlyRecordId, db = null) => {
  const executor = db || pool;
  await executor.query(
    `UPDATE monthly_records
     SET status = 'paid', updated_at = NOW()
     WHERE id = $1`,
    [monthlyRecordId]
  );
};

const listPayments = async ({
  payment_status,
  month,
  year,
  payment_month,
  payment_year,
  flat_id,
  limit,
  offset,
}) => {
  const values = [];
  const filters = [];

  if (payment_status) {
    values.push(payment_status);
    filters.push(`p.payment_status = $${values.length}`);
  }
  if (month !== undefined) {
    values.push(month);
    filters.push(`mr.month = $${values.length}`);
  }
  if (year !== undefined) {
    values.push(year);
    filters.push(`mr.year = $${values.length}`);
  }
  if (payment_month !== undefined) {
    values.push(payment_month);
    filters.push(`EXTRACT(MONTH FROM p.payment_date) = $${values.length}`);
  }
  if (payment_year !== undefined) {
    values.push(payment_year);
    filters.push(`EXTRACT(YEAR FROM p.payment_date) = $${values.length}`);
  }
  if (flat_id) {
    values.push(flat_id);
    filters.push(`mr.flat_id = $${values.length}`);
  }

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;
  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const dataResult = await pool.query(
    `SELECT
       p.id,
       p.monthly_record_id,
       p.amount,
       p.payment_mode,
       p.payment_status,
       p.transaction_id,
       p.payment_date,
       p.recorded_by_admin_id,
       p.created_at,
       EXTRACT(MONTH FROM p.payment_date)::int AS payment_month,
       EXTRACT(YEAR FROM p.payment_date)::int AS payment_year,
       mr.flat_id,
       f.flat_number,
       mr.month,
       mr.year
     FROM payments p
     JOIN monthly_records mr ON mr.id = p.monthly_record_id
     JOIN flats f ON f.id = mr.flat_id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const countValues = values.slice(0, values.length - 2);
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM payments p
     JOIN monthly_records mr ON mr.id = p.monthly_record_id
     ${whereClause}`,
    countValues
  );

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

const canResidentAccessMonthlyRecord = async (residentId, monthlyRecordId, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT mr.id
     FROM monthly_records mr
     JOIN flat_residents fr ON fr.flat_id = mr.flat_id
     WHERE mr.id = $1
       AND fr.resident_id = $2
       AND make_date(mr.year, mr.month, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date(mr.year, mr.month, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
     LIMIT 1`,
    [monthlyRecordId, residentId]
  );

  return Boolean(result.rows[0]);
};

const canResidentAccessFlatPeriod = async (residentId, flatId, month, year, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT fr.id
     FROM flat_residents fr
     WHERE fr.flat_id = $1
       AND fr.resident_id = $2
       AND make_date($3, $4, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date($3, $4, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)
     LIMIT 1`,
    [flatId, residentId, year, month]
  );

  return Boolean(result.rows[0]);
};

const findAdminByAuth0Id = async (auth0Id, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id
     FROM admins
     WHERE auth0_id = $1
     LIMIT 1`,
    [auth0Id]
  );
  return result.rows[0] || null;
};

export {
  findMonthlyRecordById,
  findMonthlyRecordByFlatPeriod,
  findApplicablePlanAmountForFlat,
  createMonthlyRecord,
  findCompletedPaymentByMonthlyRecordId,
  createPayment,
  markMonthlyRecordPaid,
  listPayments,
  canResidentAccessMonthlyRecord,
  canResidentAccessFlatPeriod,
  findAdminByAuth0Id,
};
