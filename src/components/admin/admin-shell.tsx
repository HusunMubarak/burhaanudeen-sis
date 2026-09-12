"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AdminSidebarNav } from "@/components/admin/sidebar";
import { AdminTopbar } from "@/components/admin/topbar";
import type { RoleName } from "@/lib/rbac";

export function AdminShell({
  roles,
  name,
  children,
}: {
  roles: RoleName[];
  name: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-paper-dim">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <AdminSidebarNav roles={roles} />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="relative flex w-72 max-w-[80vw] flex-col">
            <AdminSidebarNav roles={roles} onNavigate={() => setMobileOpen(false)} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-paper"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar name={name} roles={roles} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
