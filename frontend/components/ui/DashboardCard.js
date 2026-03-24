export default function DashboardCard({ title, value, hint }) {
  return (
    <div className="rounded border border-slate-300 bg-white p-3">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}
