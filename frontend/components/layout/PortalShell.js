"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";

function MobileBackdrop({ onClose }) {
  return <div className="fixed inset-0 z-30 bg-slate-900/45 lg:hidden" onClick={onClose} />;
}

function MobileMenuButton({ mobileSidebarOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="cursor-pointer rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-700 lg:hidden"
      aria-label={mobileSidebarOpen ? "Close menu" : "Open menu"}
    >
      {mobileSidebarOpen ? <X size={16} /> : <Menu size={16} />}
    </button>
  );
}

export default function PortalShell({ title, items, pageTitle, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const closeMobileSidebar = () => setMobileSidebarOpen(false);
  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50">
      {mobileSidebarOpen ? <MobileBackdrop onClose={closeMobileSidebar} /> : null}
      <div className="flex">
        <Sidebar
          title={title}
          items={items}
          mobileOpen={mobileSidebarOpen}
          onClose={closeMobileSidebar}
        />
        <main className="min-h-screen min-w-0 w-full flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:ml-64">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{pageTitle}</h2>
              <MobileMenuButton
                mobileSidebarOpen={mobileSidebarOpen}
                onToggle={toggleMobileSidebar}
              />
            </div>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
