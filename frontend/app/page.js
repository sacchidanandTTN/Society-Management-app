import PortalAccessButtons from "@/components/auth/PortalAccessButtons";

export default async function HomePage({ searchParams }) {
  const q = await searchParams;
  const authError = q?.authError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <main className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Society Subscription Management
        </h1>
        {authError === "unauthorized" ? (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            You are not authorized for that portal.
          </div>
        ) : null}
        <p className="mt-2 text-sm text-slate-600">
          Select your portal to login
        </p>
        <PortalAccessButtons />
      </main>
    </div>
  );
}
