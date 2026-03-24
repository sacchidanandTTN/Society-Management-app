import pool from "../db/pool.js";
import {
  findPlanForFlatTypeOnDate,
  insertMonthlyRecord,
  listActiveCurrentAllocations,
} from "../repositories/subscription.repository.js";

const toYearMonth = (dateValue) => {
  const date = new Date(dateValue);
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
  };
};

const iterateMonths = (startYear, startMonth, endYear, endMonth) => {
  const months = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    months.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

const formatMonthDate = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const generateMonthlyRecords = async ({ allocations, dbClient }) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const created = [];
  const skipped = [];

  for (const allocation of allocations) {
    const { year: startYear, month: startMonth } = toYearMonth(allocation.start_date);

    if (
      startYear > currentYear ||
      (startYear === currentYear && startMonth > currentMonth)
    ) {
      continue;
    }

    const months = iterateMonths(startYear, startMonth, currentYear, currentMonth);

    for (const period of months) {
      const plan = await findPlanForFlatTypeOnDate(
        allocation.flat_type_id,
        formatMonthDate(period.year, period.month, 1),
        dbClient
      );

      if (!plan) {
        skipped.push({
          flat_id: allocation.flat_id,
          month: period.month,
          year: period.year,
          reason: "No applicable subscription plan found.",
        });
        continue;
      }

      const inserted = await insertMonthlyRecord(
        {
          flat_id: allocation.flat_id,
          month: period.month,
          year: period.year,
          amount: plan.monthly_amount,
          status: "pending",
          due_date: formatMonthDate(period.year, period.month, 15),
        },
        dbClient
      );

      if (inserted) {
        created.push(inserted);
      } else {
        skipped.push({
          flat_id: allocation.flat_id,
          month: period.month,
          year: period.year,
          reason: "Monthly record already exists for this period.",
        });
      }
    }
  }

  return { created, skipped };
};

const ensureMonthlyRecords = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const allocations = await listActiveCurrentAllocations(client);
    const result = await generateMonthlyRecords({
      allocations,
      dbClient: client,
    });
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export {
  generateMonthlyRecords,
  ensureMonthlyRecords,
};
