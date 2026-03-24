"use client";

import { useEffect, useState } from "react";
import DashboardCard from "@/components/ui/DashboardCard";
import { userApi } from "@/lib/api/user";
import { getApiErrorMessage } from "@/lib/api/error";
import { useToast } from "@/providers/ToastProvider";

export default function UserDashboardPage() {
  const { showToast } = useToast();
  const [stats, setStats] = useState({
    pending_records: 0,
    paid_records: 0,
    pending_amount: 0,
    unread_notifications: 0,
  });
  const [currentMonthSummary, setCurrentMonthSummary] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    amount_due: 0,
  });
  const [recentPayments, setRecentPayments] = useState([]);

  useEffect(() => {
    let active = true;

    const fetchDashboard = async () => {
      try {
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const [dashboardResult, recordsResult, paymentsResult] = await Promise.allSettled([
          userApi.getDashboard(),
          userApi.listMonthlyRecords({
            page: 1,
            limit: 100,
            month: currentMonth,
            year: currentYear,
          }),
          userApi.listPayments({ page: 1, limit: 5 }),
        ]);

        const dashboardData =
          dashboardResult.status === "fulfilled" ? dashboardResult.value : null;
        const monthRecordsData = recordsResult.status === "fulfilled" ? recordsResult.value : null;
        const paymentsData = paymentsResult.status === "fulfilled" ? paymentsResult.value : null;

        if (active) {
          setStats(
            dashboardData?.stats || {
              pending_records: 0,
              paid_records: 0,
              pending_amount: 0,
              unread_notifications: 0,
            }
          );

          const monthItems = monthRecordsData?.items || [];
          const paid = monthItems.filter((item) => item.status === "paid").length;
          const pendingItems = monthItems.filter((item) => item.status === "pending");
          const pending = pendingItems.length;
          const amount_due = pendingItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

          setCurrentMonthSummary({
            total: monthItems.length,
            paid,
            pending,
            amount_due,
          });
          setRecentPayments(paymentsData?.items || []);
        }

        if (
          dashboardResult.status === "rejected" ||
          recordsResult.status === "rejected" ||
          paymentsResult.status === "rejected"
        ) {
          showToast({ type: "error", message: "Some dashboard data could not be loaded." });
        }
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      }
    };

    void fetchDashboard();
    return () => {
      active = false;
    };
  }, [showToast]);

  const currentMonthStatusText =
    currentMonthSummary.total === 0
      ? "No subscription records for current month."
      : currentMonthSummary.pending === 0
      ? "Current month subscriptions are fully paid."
      : `${currentMonthSummary.pending} subscription(s) pending this month.`;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Dashboard</h3>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard title="Pending Subscriptions" value={stats.pending_records || 0} />
        <DashboardCard title="Paid Subscriptions" value={stats.paid_records || 0} />
        <DashboardCard
          title="Pending Amount"
          value={Number(stats.pending_amount || 0).toFixed(2)}
        />
        <DashboardCard title="Unread Notifications" value={stats.unread_notifications || 0} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-semibold text-slate-900">Current Month Subscription Status</h4>
        <p className="mt-2 text-sm text-slate-700">{currentMonthStatusText}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Total: <span className="font-semibold">{currentMonthSummary.total}</span>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Paid: <span className="font-semibold">{currentMonthSummary.paid}</span>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Due: <span className="font-semibold">{Number(currentMonthSummary.amount_due).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-2 text-sm font-semibold text-slate-900">Payment History Overview</h4>
          {recentPayments.length ? (
            <div className="space-y-2">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                >
                  {payment.flat_number} | {payment.month}/{payment.year} | {payment.amount} |{" "}
                  <span className="uppercase">{payment.payment_mode}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No payment history found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
