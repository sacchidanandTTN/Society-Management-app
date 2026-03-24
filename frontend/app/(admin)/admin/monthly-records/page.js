"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import SkeletonTable from "@/components/ui/SkeletonTable";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/providers/ToastProvider";

const PAGE_SIZE = 10;

export default function AdminMonthlyRecordsPage() {
  const { showToast } = useToast();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: String(new Date().getMonth() + 1),
    year: String(new Date().getFullYear()),
    page: 1,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paying, setPaying] = useState(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.listMonthlyRecords({
        page: filters.page,
        limit: PAGE_SIZE,
        month: Number(filters.month),
        year: Number(filters.year),
      });
      setRecords(data.items || []);
      setPagination(
        data.pagination || {
          page: 1,
          limit: PAGE_SIZE,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [showToast, filters.month, filters.page, filters.year]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const openPaymentModal = (record) => {
    setSelectedRecord(record);
    setPaymentMode("cash");
    setPaymentModalOpen(true);
  };

  const markAsPaid = async () => {
    if (!selectedRecord?.id) return;
    setPaying(true);
    try {
      await adminApi.createPayment({
        monthly_record_id: selectedRecord.id,
        payment_mode: paymentMode,
      });
      showToast({ type: "success", message: "Payment marked." });
      setPaymentModalOpen(false);
      setSelectedRecord(null);
      await loadRecords();
    } catch (error) {
      showToast({ type: "error", message: getApiErrorMessage(error) });
    } finally {
      setPaying(false);
    }
  };

  const paidCount = records.filter((record) => record.status === "paid").length;
  const pendingCount = records.filter((record) => record.status === "pending").length;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Monthly Subscription Records</h3>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={filters.month}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              month: event.target.value,
              page: 1,
            }))
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          {Array.from({ length: 12 }).map((_, index) => {
            const month = index + 1;
            return (
              <option key={month} value={String(month)}>
                Month {month}
              </option>
            );
          })}
        </select>

        <input
          type="number"
          value={filters.year}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              year: event.target.value,
              page: 1,
            }))
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Year"
        />

        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Paid: <span className="font-semibold">{paidCount}</span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Pending: <span className="font-semibold">{pendingCount}</span>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 md:hidden">
            {records.length ? (
              records.map((record) => (
                <div key={record.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{record.flat_number}</p>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        record.status === "paid" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    Period: {record.month}/{record.year}
                  </p>
                  <p className="mt-1 text-xs text-slate-700">Amount: {record.amount}</p>
                  <div className="mt-3">
                    <button
                      type="button"
                      disabled={record.status === "paid"}
                      onClick={() => openPaymentModal(record)}
                      className="w-full cursor-pointer rounded bg-slate-900 px-3 py-2 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark as Paid
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500">
                No records found for selected period.
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length ? (
                  records.map((record) => (
                    <tr key={record.id} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-slate-800">{record.flat_number}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {record.month}/{record.year}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{record.amount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            record.status === "paid"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={record.status === "paid"}
                          onClick={() => openPaymentModal(record)}
                          className="cursor-pointer rounded bg-slate-900 px-3 py-1 text-xs text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark as Paid
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No records found for selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
        <p className="text-sm text-slate-600">
          Showing page {pagination.page} of {pagination.totalPages} (total {pagination.total} records)
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: Math.max(1, prev.page - 1),
              }))
            }
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                page: prev.page + 1,
              }))
            }
            className="cursor-pointer rounded border border-slate-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <Modal
        open={paymentModalOpen}
        title="Record Payment"
        onClose={() => {
          if (paying) return;
          setPaymentModalOpen(false);
          setSelectedRecord(null);
        }}
      >
        <div className="space-y-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              <span className="font-medium">Flat:</span> {selectedRecord?.flat_number || "-"}
            </p>
            <p>
              <span className="font-medium">Period:</span> {selectedRecord?.month || "-"}
              /{selectedRecord?.year || "-"}
            </p>
            <p>
              <span className="font-medium">Amount:</span> {selectedRecord?.amount || "-"}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Payment Method</label>
            <select
              value={paymentMode}
              onChange={(event) => setPaymentMode(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              disabled={paying}
            >
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              
            </select>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={markAsPaid}
              disabled={paying}
              className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {paying ? "Saving..." : "Confirm Payment"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
