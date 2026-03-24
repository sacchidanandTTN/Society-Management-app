import pool from "../db/pool.js";

const findResidentByEmail = async (email) => {
  const result = await pool.query("SELECT * FROM residents WHERE email = $1", [email]);
  return result.rows[0] || null;
};

const createResident = async ({ name, email, phone, auth0Id }) => {
  const result = await pool.query(
    `INSERT INTO residents (id, name, email, phone, auth0_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
     RETURNING id, name, email, phone, auth0_id, created_at, updated_at`,
    [name, email, phone, auth0Id]
  );

  return result.rows[0];
};

const listResidents = async ({ search = "", limit = 10, offset = 0 }) => {
  const values = [`%${search}%`, limit, offset];

  const dataQuery = `
    SELECT
      r.id,
      r.name,
      r.email,
      r.phone,
      r.auth0_id,
      EXISTS (
        SELECT 1
        FROM admins a
        WHERE a.auth0_id = r.auth0_id
      ) AS is_admin,
      r.created_at,
      r.updated_at
    FROM residents r
    WHERE r.name ILIKE $1 OR r.email ILIKE $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM residents
    WHERE name ILIKE $1 OR email ILIKE $1
  `;

  const dataResult = await pool.query(dataQuery, values);
  const countResult = await pool.query(countQuery, [values[0]]);

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

const findResidentById = async (residentId) => {
  const result = await pool.query(
    `SELECT
       r.id,
       r.name,
       r.email,
       r.phone,
       r.auth0_id,
       EXISTS (
         SELECT 1
         FROM admins a
         WHERE a.auth0_id = r.auth0_id
       ) AS is_admin,
       r.created_at,
       r.updated_at
     FROM residents r
     WHERE r.id = $1`,
    [residentId]
  );

  return result.rows[0] || null;
};

const updateResidentById = async (residentId, payload) => {
  const fields = [];
  const values = [];

  if (payload.name !== undefined) {
    values.push(payload.name);
    fields.push(`name = $${values.length}`);
  }
  if (payload.email !== undefined) {
    values.push(payload.email);
    fields.push(`email = $${values.length}`);
  }
  if (payload.phone !== undefined) {
    values.push(payload.phone);
    fields.push(`phone = $${values.length}`);
  }

  values.push(residentId);
  const residentIdIndex = values.length;

  const result = await pool.query(
    `UPDATE residents
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${residentIdIndex}
     RETURNING id, name, email, phone, auth0_id, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
};

const closeCurrentAllocationsByResident = async (residentId) => {
  await pool.query(
    `UPDATE flat_residents
     SET is_current = false, end_date = COALESCE(end_date, CURRENT_DATE)
     WHERE resident_id = $1 AND is_current = true`,
    [residentId]
  );
};

const getResidentDeactivationGuardData = async (residentId) => {
  const result = await pool.query(
    `SELECT
       (
         SELECT COUNT(*)::int
         FROM flat_residents fr
         WHERE fr.resident_id = $1
           AND fr.is_current = true
       ) AS active_allocations,
       (
         SELECT COUNT(*)::int
         FROM monthly_records mr
         WHERE mr.status = 'pending'
           AND mr.flat_id IN (
             SELECT fr.flat_id
             FROM flat_residents fr
             WHERE fr.resident_id = $1
               AND fr.is_current = true
           )
       ) AS pending_due_records,
       (
         SELECT COALESCE(SUM(mr.amount), 0)::numeric
         FROM monthly_records mr
         WHERE mr.status = 'pending'
           AND mr.flat_id IN (
             SELECT fr.flat_id
             FROM flat_residents fr
             WHERE fr.resident_id = $1
               AND fr.is_current = true
           )
       ) AS pending_due_amount`,
    [residentId]
  );

  return (
    result.rows[0] || {
      active_allocations: 0,
      pending_due_records: 0,
      pending_due_amount: 0,
    }
  );
};

const isAdminLinkedResident = async (auth0Id) => {
  const result = await pool.query(
    `SELECT EXISTS(
       SELECT 1
       FROM admins
       WHERE auth0_id = $1
     ) AS is_admin`,
    [auth0Id]
  );
  return Boolean(result.rows[0]?.is_admin);
};

export {
  findResidentByEmail,
  createResident,
  listResidents,
  findResidentById,
  updateResidentById,
  closeCurrentAllocationsByResident,
  getResidentDeactivationGuardData,
  isAdminLinkedResident,
};
