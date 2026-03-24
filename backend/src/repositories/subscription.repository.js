import pool from "../db/pool.js";

const createSubscriptionPlan = async ({ flat_type_id, monthly_amount, effective_from }) => {
  const result = await pool.query(
    `INSERT INTO subscription_plans
      (id, flat_type_id, monthly_amount, effective_from, created_at, updated_at)
     VALUES
      (gen_random_uuid(), $1, $2, $3::date, NOW(), NOW())
     RETURNING id, flat_type_id, monthly_amount, effective_from, created_at, updated_at`,
    [flat_type_id, monthly_amount, effective_from]
  );

  return result.rows[0];
};

const listSubscriptionPlans = async ({ flat_type_id }) => {
  const values = [];
  const where = flat_type_id ? "WHERE sp.flat_type_id = $1" : "";
  if (flat_type_id) values.push(flat_type_id);

  const result = await pool.query(
    `SELECT
       sp.id,
       sp.flat_type_id,
       ft.name AS flat_type_name,
       sp.monthly_amount,
       sp.effective_from,
       sp.created_at,
       sp.updated_at
     FROM subscription_plans sp
     JOIN flat_types ft ON ft.id = sp.flat_type_id
     ${where}
     ORDER BY sp.flat_type_id ASC, sp.effective_from DESC`,
    values
  );

  return result.rows;
};

const findFlatTypeById = async (flatTypeId) => {
  const result = await pool.query("SELECT id, name FROM flat_types WHERE id = $1", [flatTypeId]);
  return result.rows[0] || null;
};

const findPlanForFlatTypeOnDate = async (flatTypeId, referenceDate, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id, flat_type_id, monthly_amount, effective_from
     FROM subscription_plans
     WHERE flat_type_id = $1 AND effective_from <= $2::date
     ORDER BY effective_from DESC
     LIMIT 1`,
    [flatTypeId, referenceDate]
  );

  return result.rows[0] || null;
};

const listActiveAllocatedFlatsForMonth = async (year, month, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT DISTINCT f.id, f.flat_number, f.flat_type_id
     FROM flats f
     JOIN flat_residents fr ON fr.flat_id = f.id
     WHERE f.is_active = true
       AND fr.is_current = true
       AND make_date($1, $2, 1) >= date_trunc('month', fr.start_date)::date
       AND make_date($1, $2, 1) <= COALESCE(fr.end_date, '9999-12-31'::date)`,
    [year, month]
  );

  return result.rows;
};

const listActiveCurrentAllocations = async (db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT
       f.id AS flat_id,
       f.flat_number,
       f.flat_type_id,
       fr.start_date
     FROM flats f
     JOIN flat_residents fr ON fr.flat_id = f.id
     WHERE f.is_active = true
       AND fr.is_current = true`
  );

  return result.rows;
};

const insertMonthlyRecord = async (
  { flat_id, month, year, amount, status = "pending", due_date },
  db = null
) => {
  const executor = db || pool;
  const result = await executor.query(
    `INSERT INTO monthly_records
      (id, flat_id, month, year, amount, status, due_date, created_at, updated_at)
     VALUES
      (gen_random_uuid(), $1, $2, $3, $4, $5, $6::date, NOW(), NOW())
     ON CONFLICT (flat_id, month, year) DO NOTHING
     RETURNING id, flat_id, month, year, amount, status, due_date, created_at, updated_at`,
    [flat_id, month, year, amount, status, due_date]
  );

  return result.rows[0] || null;
};

const listMonthlyRecords = async ({ month, year, flat_id, status, limit, offset }) => {
  const filters = [];
  const values = [];

  if (month !== undefined) {
    values.push(month);
    filters.push(`mr.month = $${values.length}`);
  }
  if (year !== undefined) {
    values.push(year);
    filters.push(`mr.year = $${values.length}`);
  }
  if (flat_id) {
    values.push(flat_id);
    filters.push(`mr.flat_id = $${values.length}`);
  }
  if (status) {
    values.push(status);
    filters.push(`mr.status = $${values.length}`);
  }

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const dataResult = await pool.query(
    `SELECT
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
     ${whereClause}
     ORDER BY mr.year DESC, mr.month DESC, f.flat_number ASC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const countFilters = [];
  const countValues = [];
  if (month !== undefined) {
    countValues.push(month);
    countFilters.push(`month = $${countValues.length}`);
  }
  if (year !== undefined) {
    countValues.push(year);
    countFilters.push(`year = $${countValues.length}`);
  }
  if (flat_id) {
    countValues.push(flat_id);
    countFilters.push(`flat_id = $${countValues.length}`);
  }
  if (status) {
    countValues.push(status);
    countFilters.push(`status = $${countValues.length}`);
  }

  const countWhere = countFilters.length ? `WHERE ${countFilters.join(" AND ")}` : "";
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM monthly_records ${countWhere}`,
    countValues
  );

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

export {
  createSubscriptionPlan,
  listSubscriptionPlans,
  findFlatTypeById,
  findPlanForFlatTypeOnDate,
  listActiveAllocatedFlatsForMonth,
  listActiveCurrentAllocations,
  insertMonthlyRecord,
  listMonthlyRecords,
};
