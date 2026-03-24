"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { userApi } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/error";
import SkeletonTable from "@/components/ui/SkeletonTable";
import { monthName } from "@/lib/utils/format";
import { mergeRecordsWithPayments } from "@/lib/utils/payments";
import { useToast } from "@/providers/ToastProvider";

export default function UserSubscriptionMonthDetailsPage() {
  const { showToast } = useToast();
  const params = useParams();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const month = Number(params?.month);
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const hasValidMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const hasValidYear = Number.isInteger(year) && year >= 2000 && year <= 2100;

  useEffect(() => {
    if (!hasValidMonth || !hasValidYear) {
      setLoading(false);
      return;
    }

    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [recordsData, paymentsData] = await Promise.all([
          userApi.listMonthlyRecords({ page: 1, limit: 100, month, year }),
          userApi.listPayments({ page: 1, limit: 100 }),
        ]);

        const relevantPayments = (paymentsData?.items || []).filter(
          (payment) => Number(payment.month) === month && Number(payment.year) === year
        );
        const mergedItems = mergeRecordsWithPayments(recordsData?.items || [], relevantPayments).map(
          (item) => ({
            ...item,
            payment_mode: item.payment_mode || "-",
          })
        );

        if (active) {
          setItems(mergedItems);
        }
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      } finally {
        if (active) setLoading(false);
      }
    };

    void fetchData();
    return () => {
      active = false;
    };
  }, [hasValidMonth, hasValidYear, month, year, showToast]);

  const summary = useMemo(() => {
    const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const paidItems = items.filter((item) => item.status === "paid");
    const pendingItems = items.filter((item) => item.status === "pending");
    const paidAmount = paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingAmount = pendingItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    return {
      totalBills: items.length,
      totalAmount,
      paidCount: paidItems.length,
      paidAmount,
      pendingCount: pendingItems.length,
      pendingAmount,
    };
  }, [items]);

  if (!hasValidMonth || !hasValidYear) {
    return (
      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Subscription Details</h3>
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Invalid month/year selected.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">
          Subscription Details - {monthName(month)} {year}
        </h3>
        <Link href="/user/subscriptions" className="text-sm text-slate-900 underline">
          Back to Subscriptions
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Total Bills: <span className="font-semibold">{summary.totalBills}</span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Total Charges: <span className="font-semibold">{summary.totalAmount.toFixed(2)}</span>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Pending:{" "}
          <span className="font-semibold">
            {summary.pendingCount} ({summary.pendingAmount.toFixed(2)})
          </span>
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.length ? (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Receipt - Flat {item.flat_number}
                    </p>
                    <p className="text-xs text-slate-500">
                      {monthName(month)} {year}
                    </p>
                  </div>
                  <span
                    className={`rounded px-2 py-1 text-xs capitalize ${
                      item.status === "paid"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Subscription Charge</span>
                    <span className="font-medium">{item.amount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due Date</span>
                    <span>{item.due_date?.slice(0, 10) || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Date</span>
                    <span>{item.payment_date?.slice(0, 10) || "-"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Payment Mode</span>
                    <span className="uppercase">{item.payment_mode || "-"}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-slate-500 sm:col-span-2">
              No subscription records found for this month.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
