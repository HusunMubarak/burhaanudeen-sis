"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, Search } from "lucide-react";
import { ROLE_LABELS, type RoleName } from "@/lib/rbac";
import { Badge } from "@/components/ui/card";
import { NotificationBell } from "@/components/notification-bell";

export function AdminTopbar({
  name,
  roles,
  onMenuClick,
}: {
  name: string;
  roles: RoleName[];
  onMenuClick?: () => void;
}) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between gap-3 border-b border-line bg-white/80 px-4 py-3 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <form
        className="relative hidden max-w-xs flex-1 lg:block"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get("q");
          if (q) router.push(`/admin/search?q=${encodeURIComponent(String(q))}`);
        }}
      >
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          name="q"
          placeholder="Search students, staff, applications…"
          className="w-full rounded-md border border-line bg-white py-1.5 pl-8 pr-3 text-sm"
        />
      </form>

      <div className="flex items-center gap-3">
        <NotificationBell />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-ink">{name}</p>
          <div className="flex justify-end gap-1">
            {roles.map((r) => (
              <Badge key={r} tone="emerald">
                {ROLE_LABELS[r]}
              </Badge>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-medium text-ink-soft hover:bg-paper-dim"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </header>
  );
}
