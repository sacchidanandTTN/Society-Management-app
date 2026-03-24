import pool from "../db/pool.js";

const createFlatType = async ({ name, description }) => {
  const result = await pool.query(
    `INSERT INTO flat_types (id, name, description, created_at)
     VALUES (gen_random_uuid(), $1, $2, NOW())
     RETURNING id, name, description, created_at`,
    [name, description]
  );

  return result.rows[0];
};

const listFlatTypes = async () => {
  const result = await pool.query(
    `SELECT id, name, description, created_at
     FROM flat_types
     ORDER BY name ASC`
  );

  return result.rows;
};

const findFlatTypeById = async (flatTypeId) => {
  const result = await pool.query(
    `SELECT id, name, description, created_at
     FROM flat_types
     WHERE id = $1`,
    [flatTypeId]
  );

  return result.rows[0] || null;
};

const createFlat = async ({ flat_number, flat_type_id, is_active }) => {
  const result = await pool.query(
    `INSERT INTO flats (id, flat_number, flat_type_id, is_active, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
     RETURNING id, flat_number, flat_type_id, is_active, created_at, updated_at`,
    [flat_number, flat_type_id, is_active]
  );

  return result.rows[0];
};

const listFlats = async ({ search, is_active, limit, offset }) => {
  const filters = [];
  const values = [];

  if (search) {
    values.push(`%${search}%`);
    filters.push(`f.flat_number ILIKE $${values.length}`);
  }

  if (is_active !== undefined) {
    values.push(is_active);
    filters.push(`f.is_active = $${values.length}`);
  }

  values.push(limit);
  const limitIndex = values.length;
  values.push(offset);
  const offsetIndex = values.length;

  const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  const dataResult = await pool.query(
    `SELECT
       f.id,
       f.flat_number,
       f.flat_type_id,
       ft.name AS flat_type_name,
       fr.id AS current_allocation_id,
       fr.resident_id AS allocated_resident_id,
       r.name AS owner_name,
       r.email AS owner_email,
       r.phone AS owner_phone,
       f.is_active,
       f.created_at,
       f.updated_at
     FROM flats f
     JOIN flat_types ft ON ft.id = f.flat_type_id
     LEFT JOIN flat_residents fr ON fr.flat_id = f.id AND fr.is_current = true
     LEFT JOIN residents r ON r.id = fr.resident_id
     ${whereClause}
     ORDER BY f.created_at DESC
     LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
    values
  );

  const countFilters = [];
  const countValues = [];

  if (search) {
    countValues.push(`%${search}%`);
    countFilters.push(`flat_number ILIKE $${countValues.length}`);
  }
  if (is_active !== undefined) {
    countValues.push(is_active);
    countFilters.push(`is_active = $${countValues.length}`);
  }

  const countWhere = countFilters.length ? `WHERE ${countFilters.join(" AND ")}` : "";
  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM flats ${countWhere}`,
    countValues
  );

  return {
    rows: dataResult.rows,
    total: countResult.rows[0]?.total || 0,
  };
};

const findFlatById = async (flatId) => {
  const result = await pool.query(
    `SELECT
       f.id,
       f.flat_number,
       f.flat_type_id,
       ft.name AS flat_type_name,
       fr.id AS current_allocation_id,
       fr.resident_id AS allocated_resident_id,
       r.name AS owner_name,
       r.email AS owner_email,
       r.phone AS owner_phone,
       f.is_active,
       f.created_at,
       f.updated_at
     FROM flats f
     JOIN flat_types ft ON ft.id = f.flat_type_id
     LEFT JOIN flat_residents fr ON fr.flat_id = f.id AND fr.is_current = true
     LEFT JOIN residents r ON r.id = fr.resident_id
     WHERE f.id = $1`,
    [flatId]
  );

  return result.rows[0] || null;
};

const updateFlatById = async (flatId, payload) => {
  const fields = [];
  const values = [];

  if (payload.flat_number !== undefined) {
    values.push(payload.flat_number);
    fields.push(`flat_number = $${values.length}`);
  }
  if (payload.flat_type_id !== undefined) {
    values.push(payload.flat_type_id);
    fields.push(`flat_type_id = $${values.length}`);
  }
  if (payload.is_active !== undefined) {
    values.push(payload.is_active);
    fields.push(`is_active = $${values.length}`);
  }

  values.push(flatId);
  const flatIdIndex = values.length;

  const result = await pool.query(
    `UPDATE flats
     SET ${fields.join(", ")}, updated_at = NOW()
     WHERE id = $${flatIdIndex}
     RETURNING id, flat_number, flat_type_id, is_active, created_at, updated_at`,
    values
  );

  return result.rows[0] || null;
};

const deactivateFlatById = async (flatId, db = null) => {
  const executor = db || pool;
  const result = await executor.query(
    `UPDATE flats
     SET is_active = false, updated_at = NOW()
     WHERE id = $1
     RETURNING id, flat_number, flat_type_id, is_active, created_at, updated_at`,
    [flatId]
  );

  return result.rows[0] || null;
};

const activateFlatById = async (flatId) => {
  const result = await pool.query(
    `UPDATE flats
     SET is_active = true, updated_at = NOW()
     WHERE id = $1
     RETURNING id, flat_number, flat_type_id, is_active, created_at, updated_at`,
    [flatId]
  );

  return result.rows[0] || null;
};

export {
  createFlatType,
  listFlatTypes,
  findFlatTypeById,
  createFlat,
  listFlats,
  findFlatById,
  updateFlatById,
  deactivateFlatById,
  activateFlatById,
};
