export default function SkeletonTable({ rows = 5 }) {
  return (
    <div className="overflow-hidden rounded border border-slate-300 bg-white">
      <div className="grid grid-cols-4 gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-4 rounded bg-slate-200" />
        ))}
      </div>
      <div className="space-y-3 p-4">
        {Array.from({ length: rows }).map((_, row) => (
          <div key={row} className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((__, col) => (
              <div key={col} className="h-4 rounded bg-slate-200" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
