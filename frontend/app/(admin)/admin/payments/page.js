"use client";

import { useCallback, useEffect, useState } from "react";
import { useSimpleForm } from "@/lib/forms/useSimpleForm";
import Modal from "@/components/ui/Modal";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { paymentFormSchema } from "@/lib/validation/adminForms";
import { useToast } from "@/providers/ToastProvider";

export default function AdminPaymentsPage() {
  const { showToast } = useToast();
  const [paymentsState, setPaymentsState] = useState({
    status: "idle",
    items: [],
    error: null,
    pagination: null,
  });
  const [flatOptions, setFlatOptions] = useState([]);
  const [open, setOpen] = useState(false);

  const form = useSimpleForm({
    schema: paymentFormSchema,
    defaultValues: {
      flat_id: "",
      month: String(new Date().getMonth() + 1),
      year: String(new Date().getFullYear()),
      payment_mode: "cash",
    },
  });

  const loadPayments = useCallback(async () => {
    setPaymentsState((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await adminApi.listPayments({ page: 1, limit: 50 });
      setPaymentsState({
        status: "succeeded",
        items: data.items || [],
        error: null,
        pagination: data.pagination || null,
      });
    } catch (error) {
      setPaymentsState({
        status: "failed",
        items: [],
        error: getApiErrorMessage(error),
        pagination: null,
      });
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadPayments();
    adminApi
      .listFlats({ page: 1, limit: 100, is_active: true })
      .then((data) => setFlatOptions(data.items || []))
      .catch((error) => showToast({ type: "error", message: getApiErrorMessage(error) }));
  }, [loadPayments, showToast]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await adminApi.createPayment(values);
      showToast({ type: "success", message: "Payment done." });
      setOpen(false);
      form.reset({
        flat_id: "",
        month: String(new Date().getMonth() + 1),
        year: String(new Date().getFullYear()),
        payment_mode: "cash",
      });
      await loadPayments();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    }
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Payments</h3>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        >
          Record Payment
        </button>
      </div>

      {paymentsState.status === "loading" ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {paymentsState.items?.length ? (
              paymentsState.items.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">{payment.flat_number || "-"}</p>
                  <p className="mt-1 text-xs text-slate-700">
                    Period: {payment.month}/{payment.year}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">Amount: {payment.amount}</p>
                  <p className="mt-1 text-xs text-slate-700 uppercase">Mode: {payment.payment_mode}</p>
                  <p className="mt-1 text-xs text-slate-700 capitalize">Status: {payment.payment_status}</p>
                  <p className="mt-1 text-xs text-slate-700">
                    Paid On:{" "}
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "-"}
                  </p>
                  <p className="mt-1 text-xs text-slate-600 break-all">
                    Transaction ID: {payment.transaction_id || "-"}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
                No payments found.
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3">Flat</th>
                  <th className="px-4 py-3">Month/Year</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Paid On</th>
                  <th className="px-4 py-3">Transaction ID</th>
                </tr>
              </thead>
              <tbody>
                {paymentsState.items?.length ? (
                  paymentsState.items.map((payment) => (
                    <tr key={payment.id} className="border-t border-slate-200">
                      <td className="px-4 py-3">{payment.flat_number}</td>
                      <td className="px-4 py-3">
                        {payment.month}/{payment.year}
                      </td>
                      <td className="px-4 py-3">{payment.amount}</td>
                      <td className="px-4 py-3 uppercase">{payment.payment_mode}</td>
                      <td className="px-4 py-3 capitalize">{payment.payment_status}</td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{payment.transaction_id}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No payments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={open} title="Record Payment" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <label className="mb-1 block text-xs font-medium text-slate-600">Flat</label>
          <select
            {...form.register("flat_id")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Select flat</option>
            {flatOptions.map((flat) => (
              <option key={flat.id} value={flat.id}>
                {flat.flat_number}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              type="number"
              placeholder="Month"
              {...form.register("month")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              placeholder="Year"
              {...form.register("year")}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <select
            {...form.register("payment_mode")}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
           
          </select>
          <div className="flex justify-end">
            <button type="submit" className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white">
              Pay
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
