export default function PagePlaceholder({ title, description }) {
  return (
    <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </section>
  );
}
