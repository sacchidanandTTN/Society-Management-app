"use client";

import { useToast } from "@/providers/ToastProvider";

const variantClasses = {
  info: "bg-slate-900 text-white",
  success: "bg-emerald-600 text-white",
  error: "bg-red-600 text-white",
};

export default function ToastHost() {
  const { toast } = useToast();

  if (!toast.visible) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100]">
      <div
        className={`pointer-events-auto rounded border px-3 py-2 text-sm ${
          variantClasses[toast.type] || variantClasses.info
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
