"use client";

import { useEffect, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import Modal from "@/components/ui/Modal";
import { userApi } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/error";
import { userPayNowSchema } from "@/lib/validation/userForms";
import { useToast } from "@/providers/ToastProvider";

export default function UserPayNowPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [open, setOpen] = useState(false);

  const form = useSimpleForm({
    schema: userPayNowSchema,
    defaultValues: {
      monthly_record_id: "",
      payment_mode: "razorpay",
    },
  });

  useEffect(() => {
    let active = true;
    const fetchRecords = async () => {
      try {
        const data = await userApi.listMonthlyRecords({ page: 1, limit: 100, status: "pending" });
        if (active) setRows(data.items || []);
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      }
    };
    void fetchRecords();
    return () => {
      active = false;
    };
  }, [showToast]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const payload = {
        monthly_record_id: values.monthly_record_id,
        payment_mode: "razorpay",
      };
      const response = await userApi.payNow(payload);
      setResult(response);
      setOpen(true);
      showToast({ type: "success", message: "Payment done." });
      form.reset({
        monthly_record_id: "",
        payment_mode: "razorpay",
      });
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Pay Now</h3>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <form className="space-y-3" onSubmit={onSubmit}>
          <select
            {...form.register("monthly_record_id")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select pending monthly record</option>
            {rows.map((record) => (
              <option key={record.id} value={record.id}>
                {record.flat_number} - {record.month}/{record.year} - {record.amount}
              </option>
            ))}
          </select>
          {form.formState.errors.monthly_record_id ? (
            <p className="text-xs text-red-600">{form.formState.errors.monthly_record_id.message}</p>
          ) : null}
          <div className="flex justify-end">
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              Pay using Razorpay
            </button>
          </div>
        </form>
      </div>

      <Modal open={open} title="Receipt" onClose={() => setOpen(false)}>
        {result?.receipt ? (
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              <span className="font-medium">Receipt Number:</span> {result.receipt.receipt_number}
            </p>
            <p>
              <span className="font-medium">Transaction ID:</span>{" "}
              {result.payment?.transaction_id}
            </p>
            <p>
              <span className="font-medium">Amount:</span> {result.payment?.amount}
            </p>
            <p>
              <span className="font-medium">Generated At:</span>{" "}
              {result.receipt.generated_at}
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No receipt generated yet.</p>
        )}
      </Modal>
    </section>
  );
}
