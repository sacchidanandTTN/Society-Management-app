import ApiError from "../utils/ApiError.js";
import pool from "../db/pool.js";
import {
  canResidentAccessFlatPeriod,
  canResidentAccessMonthlyRecord,
  createMonthlyRecord,
  createPayment,
  findApplicablePlanAmountForFlat,
  findCompletedPaymentByMonthlyRecordId,
  findMonthlyRecordByFlatPeriod,
  findMonthlyRecordById,
  markMonthlyRecordPaid,
} from "../repositories/payment.repository.js";

const createFakeTransactionId = (paymentMode) =>
  `${paymentMode.toUpperCase()}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 10)
    .toUpperCase()}`;

const createReceiptPayload = (payment) => {
  const receiptNumber = `RCP-${new Date().getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
  return {
    payment_id: payment.id,
    receipt_number: receiptNumber,
    receipt_url: `/receipts/${receiptNumber}`,
    generated_at: new Date().toISOString(),
  };
};

const formatMonthDate = (year, month, day) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const resolveMonthlyRecord = async (
  { monthly_record_id, flat_id, month, year },
  { client, enforceResidentId }
) => {
  if (monthly_record_id) {
    const row = await findMonthlyRecordById(monthly_record_id, client);
    if (!row) throw new ApiError(404, "Monthly record not found.");

    if (enforceResidentId) {
      const ok = await canResidentAccessMonthlyRecord(
        enforceResidentId,
        monthly_record_id,
        client
      );
      if (!ok) {
        throw new ApiError(403, "No access to this monthly record.");
      }
    }
    return row;
  }

  if (!flat_id || !month || !year) {
    throw new ApiError(400, "Provide flat_id, month and year.");
  }

  if (enforceResidentId) {
    const ok = await canResidentAccessFlatPeriod(
      enforceResidentId,
      flat_id,
      month,
      year,
      client
    );
    if (!ok) {
      throw new ApiError(403, "No access to this flat period.");
    }
  }

  const row = await findMonthlyRecordByFlatPeriod(flat_id, month, year, client);
  if (row) return row;

  const amt = await findApplicablePlanAmountForFlat(
    flat_id,
    formatMonthDate(year, month, 1),
    client
  );
  if (!amt) {
    throw new ApiError(400, "No plan found for this flat and month.");
  }

  const newRow = await createMonthlyRecord(
    {
      flatId: flat_id,
      month,
      year,
      amount: amt,
      dueDate: formatMonthDate(year, month, 15),
      status: "pending",
    },
    client
  );

  if (newRow) return newRow;
  const sameRow = await findMonthlyRecordByFlatPeriod(flat_id, month, year, client);
  if (!sameRow) throw new ApiError(500, "Could not resolve monthly record.");
  return sameRow;
};

const processPayment = async ({
  payload,
  recordedByAdminId = null,
  residentId = null,
}) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const record = await resolveMonthlyRecord(payload, {
      client,
      enforceResidentId: residentId,
    });

    if (record.status === "paid") {
      throw new ApiError(409, "Monthly record already paid.");
    }

    const donePay = await findCompletedPaymentByMonthlyRecordId(
      record.id,
      client
    );
    if (donePay) {
      throw new ApiError(409, "Payment already exists.");
    }

    const amount = record.amount;
    const payment = await createPayment(
      {
        monthlyRecordId: record.id,
        amount,
        paymentMode: payload.payment_mode,
        paymentStatus: "completed",
        transactionId: createFakeTransactionId(payload.payment_mode),
        recordedByAdminId,
      },
      client
    );

    await markMonthlyRecordPaid(record.id, client);

    await client.query("COMMIT");

    return {
      payment,
      monthly_record: { ...record, status: "paid" },
      receipt: createReceiptPayload(payment),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export { processPayment };
