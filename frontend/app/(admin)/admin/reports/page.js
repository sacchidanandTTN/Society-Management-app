"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardCard from "@/components/ui/DashboardCard";
import { adminApi } from "@/lib/api/admin";
import { getApiErrorMessage } from "@/lib/api/error";
import { useToast } from "@/providers/ToastProvider";
import { jsPDF } from "jspdf";

export default function AdminReportsPage() {
  const { showToast } = useToast();
  const [monthlyRecords, setMonthlyRecords] = useState([]);
  const [payments, setPayments] = useState([]);
  const [periodType, setPeriodType] = useState("monthly");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const commonFilters = {
          page: 1,
          limit: 100,
          year: Number(year),
        };
        const paymentFilters = {
          page: 1,
          limit: 100,
          payment_year: Number(year),
        };
        if (periodType === "monthly") {
          commonFilters.month = Number(month);
          paymentFilters.payment_month = Number(month);
        }

        const [recordsData, paymentsData] = await Promise.all([
          adminApi.listMonthlyRecords(commonFilters),
          adminApi.listPayments(paymentFilters),
        ]);
        setMonthlyRecords(recordsData.items || []);
        setPayments(paymentsData.items || []);
      } catch (error) {
        showToast({ type: "error", message: getApiErrorMessage(error) });
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [showToast, month, periodType, year]);

  const report = useMemo(() => {
    const totalBilled = monthlyRecords.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );
    const completedPayments = payments.filter((item) => item.payment_status === "completed");
    const totalCollected = completedPayments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingAmount = monthlyRecords
      .filter((item) => item.status === "pending")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const pendingPayments = monthlyRecords.filter((item) => item.status === "pending").length;

    const modeBreakdown = completedPayments.reduce(
      (acc, payment) => {
        const amount = Number(payment.amount || 0);
        if (payment.payment_mode === "cash") acc.cash += amount;
        if (payment.payment_mode === "upi") acc.upi += amount;
        if (payment.payment_mode === "razorpay") acc.razorpay += amount;
        return acc;
      },
      { cash: 0, upi: 0, razorpay: 0 }
    );

    return {
      totalRecords: monthlyRecords.length,
      totalPayments: payments.length,
      totalBilled,
      totalCollected,
      pendingAmount,
      pendingPayments,
      modeBreakdown,
    };
  }, [monthlyRecords, payments]);

  const reportTitle =
    periodType === "monthly" ? `Monthly Report (${month}/${year})` : `Yearly Report (${year})`;

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const downloadCsv = () => {
    const rows = [
      ["Period Type", periodType],
      ["Month", periodType === "monthly" ? month : "All"],
      ["Year", year],
      [],
      ["Metric", "Value"],
      ["Total Records", String(report.totalRecords)],
      ["Payments Logged", String(report.totalPayments)],
      ["Total Billed", formatCurrency(report.totalBilled)],
      ["Total Collected", formatCurrency(report.totalCollected)],
      ["Pending Payments", String(report.pendingPayments)],
      ["Pending Amount", formatCurrency(report.pendingAmount)],
      [],
      ["Payment Mode", "Collected Amount"],
      ["Cash", formatCurrency(report.modeBreakdown.cash)],
      ["UPI", formatCurrency(report.modeBreakdown.upi)],
      ["Razorpay", formatCurrency(report.modeBreakdown.razorpay)],
    ];

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `financial-report-${periodType}-${year}${periodType === "monthly" ? `-${month}` : ""}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    let y = 14;

    doc.setFontSize(16);
    doc.text("Society Financial Report", 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.text(reportTitle, 14, y);
    y += 8;

    const summaryRows = [
      ["Total Records", String(report.totalRecords)],
      ["Payments Logged", String(report.totalPayments)],
      ["Total Billed", formatCurrency(report.totalBilled)],
      ["Total Collected", formatCurrency(report.totalCollected)],
      ["Pending Payments", String(report.pendingPayments)],
      ["Pending Amount", formatCurrency(report.pendingAmount)],
    ];

    doc.setFontSize(12);
    doc.text("Summary", 14, y);
    y += 6;
    doc.setFontSize(10);
    summaryRows.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 14, y);
      y += 6;
    });

    y += 4;
    doc.setFontSize(12);
    doc.text("Payment Mode Breakdown", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.text(`Cash: ${formatCurrency(report.modeBreakdown.cash)}`, 14, y);
    y += 6;
    doc.text(`UPI: ${formatCurrency(report.modeBreakdown.upi)}`, 14, y);
    y += 6;
    doc.text(`Razorpay: ${formatCurrency(report.modeBreakdown.razorpay)}`, 14, y);

    doc.save(
      `financial-report-${periodType}-${year}${periodType === "monthly" ? `-${month}` : ""}.pdf`
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Reports</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            className="cursor-pointer rounded-md border border-slate-300 px-4 py-2 text-sm"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            className="cursor-pointer rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          >
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-3">
        <select
          value={periodType}
          onChange={(event) => setPeriodType(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="monthly">Monthly Report</option>
          <option value="yearly">Yearly Report</option>
        </select>
        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
          disabled={periodType === "yearly"}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <option key={index + 1} value={String(index + 1)}>
              Month {index + 1}
            </option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="Year"
        />
      </div>

      {loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
          Loading report...
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <DashboardCard title="Monthly Records" value={report.totalRecords} />
        <DashboardCard title="Payments Logged" value={report.totalPayments} />
        <DashboardCard title="Total Billed" value={formatCurrency(report.totalBilled)} />
        <DashboardCard title="Total Collected" value={formatCurrency(report.totalCollected)} />
        <DashboardCard title="Pending Payments" value={report.pendingPayments} />
        <DashboardCard title="Pending Amount" value={formatCurrency(report.pendingAmount)} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h4 className="mb-3 text-sm font-semibold text-slate-900">Payment Mode Breakdown</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-slate-600">Cash</p>
            <p className="font-semibold text-slate-900">{formatCurrency(report.modeBreakdown.cash)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-slate-600">UPI</p>
            <p className="font-semibold text-slate-900">{formatCurrency(report.modeBreakdown.upi)}</p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
            <p className="text-slate-600">Razorpay</p>
            <p className="font-semibold text-slate-900">
              {formatCurrency(report.modeBreakdown.razorpay)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
