"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { userApi } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/error";
import { mergeRecordsWithPayments } from "@/lib/utils/payments";
import { useToast } from "@/providers/ToastProvider";

export default function UserSubscriptionsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [recData, payData] = await Promise.all([
          userApi.listMonthlyRecords({ page: 1, limit: 100 }),
          userApi.listPayments({ page: 1, limit: 100 }),
        ]);

        const merged = mergeRecordsWithPayments(recData?.items || [], payData?.items || []);

        if (active) {
          setRecords(merged);
        }
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, [showToast]);

  return (
    <section className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Subscriptions</h3>
      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3">Flat</th>
                <th className="px-4 py-3">Month/Year</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment Mode</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {records.length ? (
                records.map((record) => (
                  <tr key={record.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">{record.flat_number}</td>
                    <td className="px-4 py-3">
                      {record.month}/{record.year}
                    </td>
                    <td className="px-4 py-3">{record.amount}</td>
                    <td className="px-4 py-3">{record.due_date?.slice(0, 10)}</td>
                    <td className="px-4 py-3 capitalize">{record.status}</td>
                    <td className="px-4 py-3 uppercase">{record.payment_mode || "-"}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/user/subscriptions/${record.month}?year=${record.year}`}
                        className="text-slate-900 underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No subscriptions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
