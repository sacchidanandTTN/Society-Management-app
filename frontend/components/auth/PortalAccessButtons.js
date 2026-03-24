"use client";

import { useRouter } from "next/navigation";

export default function PortalAccessButtons() {
  const router = useRouter();

  const openPortal = (targetPath) => {
    router.push(`/api/auth/login?returnTo=${targetPath}&forceLogin=true`);
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => openPortal("/admin/dashboard")}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Admin Portal
      </button>
      <button
        type="button"
        onClick={() => openPortal("/user/dashboard")}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
      >
        Resident Portal
      </button>
    </div>
  );
}
