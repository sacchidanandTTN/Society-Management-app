import pool from "../db/pool.js";

const getAllocationById = async (allocationId) => {
  const result = await pool.query(
    `SELECT
      fr.id,
      fr.flat_id,
      f.flat_number,
      fr.resident_id,
      r.name AS resident_name,
      r.email AS resident_email,
      fr.role,
      fr.start_date,
      fr.end_date,
      fr.is_current
     FROM flat_residents fr
     JOIN flats f ON f.id = fr.flat_id
     JOIN residents r ON r.id = fr.resident_id
     WHERE fr.id = $1`,
    [allocationId]
  );

  return result.rows[0] || null;
};

const getCurrentAllocationByFlatId = async (flatId, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id, flat_id, resident_id, role, start_date, end_date, is_current
     FROM flat_residents
     WHERE flat_id = $1 AND is_current = true
     LIMIT 1`,
    [flatId]
  );

  return result.rows[0] || null;
};

const getCurrentAllocationForResidentFlat = async (flatId, residentId, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `SELECT id, flat_id, resident_id, role, start_date, end_date, is_current
     FROM flat_residents
     WHERE flat_id = $1 AND resident_id = $2 AND is_current = true
     LIMIT 1`,
    [flatId, residentId]
  );

  return result.rows[0] || null;
};

const closeCurrentAllocationForResidentFlat = async (flatId, residentId, endDate, db = null) => {
  const executor = db || pool;
  await executor.query(
    `UPDATE flat_residents
     SET is_current = false, end_date = COALESCE($3::date, CURRENT_DATE)
     WHERE flat_id = $1 AND resident_id = $2 AND is_current = true`,
    [flatId, residentId, endDate || null]
  );
};

const createAllocation = async ({ flatId, residentId, startDate }, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `INSERT INTO flat_residents
      (id, flat_id, resident_id, role, start_date, end_date, is_current)
     VALUES
      (gen_random_uuid(), $1, $2, 'user', COALESCE($3::date, CURRENT_DATE), NULL, true)
     RETURNING id, flat_id, resident_id, role, start_date, end_date, is_current`,
    [flatId, residentId, startDate || null]
  );

  return result.rows[0];
};

const endAllocationById = async (allocationId, endDate, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `UPDATE flat_residents
     SET is_current = false, end_date = COALESCE($2::date, CURRENT_DATE)
     WHERE id = $1 AND is_current = true
     RETURNING id, flat_id, resident_id, role, start_date, end_date, is_current`,
    [allocationId, endDate || null]
  );

  return result.rows[0] || null;
};

export {
  getAllocationById,
  getCurrentAllocationByFlatId,
  getCurrentAllocationForResidentFlat,
  closeCurrentAllocationForResidentFlat,
  createAllocation,
  endAllocationById,
};
