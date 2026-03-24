"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function SidebarNav({ items, pathname, onNavigate }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
      {items.map((item) => {
        const isActive = pathname === item.href;
        const itemClass = isActive
          ? "block truncate rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
          : "block truncate rounded-md px-3 py-2 text-sm text-slate-700";

        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} className={itemClass}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }) {
  return (
    <div className="border-t border-slate-200 p-3">
      <Link
        href="/api/auth/logout"
        onClick={onNavigate}
        className="block w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700"
      >
        Logout
      </Link>
    </div>
  );
}

export default function Sidebar({ title, items, mobileOpen = false, onClose }) {
  const pathname = usePathname();
  const handleNavigation = () => onClose();

  const renderContent = (mobile = false) => (
    <>
      <div className="border-b border-slate-200 px-6 py-5">
        <h1 className=" text-lg font-semibold text-slate-900">{title}</h1>
      </div>

      <SidebarNav items={items} pathname={pathname} onNavigate={handleNavigation} />
      <SidebarFooter onNavigate={handleNavigation} />
      {mobile ? (
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer border-t border-slate-200 px-3 py-3 text-sm text-slate-600 hover:bg-slate-50"
        >
          Close Menu
        </button>
      ) : null}
    </>
  );

  return (
    <>
      <aside className="hidden h-screen w-64 min-w-64 max-w-64 shrink-0 border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:flex-col">
        {renderContent(false)}
      </aside>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-full max-w-sm flex-col border-r border-slate-200 bg-white transition-transform lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
       
      >
        {renderContent(true)}
      </aside>
    </>
  );
}
