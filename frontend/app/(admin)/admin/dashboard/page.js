"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardCard from "@/components/ui/DashboardCard";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { useToast } from "@/providers/ToastProvider";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MODE_COLORS = {
  cash: "#334155",
  upi: "#0f766e",
  razorpay: "#4338ca",
};

export default function AdminDashboardPage() {
  const { showToast } = useToast();
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const currentYear = new Date().getFullYear();

    Promise.all([
      adminApi.listResidents({ page: 1, limit: 100 }),
      adminApi.listFlats({ page: 1, limit: 100 }),
      adminApi.listMonthlyRecords({ page: 1, limit: 100, year: currentYear }),
      adminApi.listPayments({ page: 1, limit: 100, payment_year: currentYear }),
    ])
      .then(([residentsData, flatsData, recordsData, paymentsData]) => {
        setResidents(residentsData.items || []);
        setFlats(flatsData.items || []);
        setMonthlyRecords(recordsData.items || []);
        setPayments(paymentsData.items || []);
      })
      .catch((error) => {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      });
  }, [showToast]);

  const dashboardData = useMemo(() => {
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const activeResidents = residents.filter((resident) => resident.is_active).length;
    const totalFlats = flats.length;
    const activeFlats = flats.filter((flat) => flat.is_active).length;

    const pendingRecords = monthlyRecords.filter((record) => record.status === "pending");
    const pendingDues = pendingRecords.reduce((sum, record) => sum + Number(record.amount || 0), 0);

    const completedPayments = payments.filter((payment) => payment.payment_status === "completed");
    const totalCollected = completedPayments.reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );
    const collectedThisMonth = completedPayments
      .filter(
        (payment) =>
          Number(payment.payment_month) === currentMonth &&
          Number(payment.payment_year) === currentYear
      )
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

    const modeMap = {
      cash: 0,
      upi: 0,
      razorpay: 0,
    };

    completedPayments.forEach((payment) => {
      if (
        Number(payment.payment_month) === currentMonth &&
        Number(payment.payment_year) === currentYear &&
        modeMap[payment.payment_mode] !== undefined
      ) {
        modeMap[payment.payment_mode] += Number(payment.amount || 0);
      }
    });

    const paymentModeData = Object.entries(modeMap).map(([mode, amount]) => ({
      mode: mode.toUpperCase(),
      amount,
      color: MODE_COLORS[mode],
    }));

    const monthlyMap = MONTH_NAMES.map((name, index) => ({
      month: name,
      monthIndex: index + 1,
      amount: 0,
    }));

    completedPayments.forEach((payment) => {
      const month = Number(payment.payment_month);
      const year = Number(payment.payment_year);
      if (year === currentYear && month >= 1 && month <= 12) {
        monthlyMap[month - 1].amount += Number(payment.amount || 0);
      }
    });

    return {
      metrics: {
        activeResidents,
        totalFlats,
        activeFlats,
        pendingPayments: pendingRecords.length,
        pendingDues,
        totalCollected,
        collectedThisMonth,
      },
      paymentModeData,
      monthlyCollectionData: monthlyMap,
    };
  }, [residents, flats, monthlyRecords, payments]);

  const currency = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const hasModeData = dashboardData.paymentModeData.some((item) => item.amount > 0);
  const hasMonthlyData = dashboardData.monthlyCollectionData.some((item) => item.amount > 0);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">Dashboard</h3>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="Active Residents" value={dashboardData.metrics.activeResidents} />
        <DashboardCard title="Total Flats" value={dashboardData.metrics.totalFlats} />
        <DashboardCard title="Active Flats" value={dashboardData.metrics.activeFlats} />
        <DashboardCard title="Pending Payments" value={dashboardData.metrics.pendingPayments} />
        <DashboardCard title="Pending Dues" value={currency(dashboardData.metrics.pendingDues)} />
        <DashboardCard
          title="Collected This Month"
          value={currency(dashboardData.metrics.collectedThisMonth)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-1 text-sm font-semibold text-slate-900">
            Collection by Payment Mode (This Month)
          </h4>
          <p className="mb-4 text-xs text-slate-500">
            Total collected this year: {currency(dashboardData.metrics.totalCollected)}
          </p>
          {hasModeData ? (
            <div className="h-70">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.paymentModeData}
                    dataKey="amount"
                    nameKey="mode"
                    innerRadius={40}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {dashboardData.paymentModeData.map((entry) => (
                      <Cell key={entry.mode} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => currency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No completed payments this month yet.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h4 className="mb-1 text-sm font-semibold text-slate-900">Monthly Collection (Current Year)</h4>
          <p className="mb-4 text-xs text-slate-500">
            Yearly trend of completed payment collection.
          </p>
          {hasMonthlyData ? (
            <div className="h-70">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.monthlyCollectionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => currency(value)} />
                  <Bar dataKey="amount" fill="#0f172a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No completed payments found for the current year.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
