"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardList,
  BookOpen,
  CalendarCheck,
  Wallet,
  Landmark,
  Banknote,
  BarChart3,
  Globe,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { StarMark } from "@/components/ui/star-mark";
import {
  MODULE_LABELS,
  MODULE_ICON_KEYS,
  visibleModulesFor,
  type ModuleName,
  type RoleName,
} from "@/lib/rbac";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardList,
  BookOpen,
  CalendarCheck,
  Wallet,
  Landmark,
  Banknote,
  BarChart3,
  Globe,
  Settings,
  ScrollText,
};

function moduleHref(mod: ModuleName) {
  return mod === "dashboard" ? "/admin" : `/admin/${mod}`;
}

export function AdminSidebarNav({
  roles,
  onNavigate,
}: {
  roles: RoleName[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const modules = visibleModulesFor(roles);
  const segment = pathname.split("/")[2];
  const activeModule: ModuleName = (segment as ModuleName) ?? "dashboard";

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-night text-paper">
      <Link href="/" className="flex items-center gap-3 border-b border-white/10 px-5 py-5" onClick={onNavigate}>
        <StarMark className="h-8 w-8" tone="gold" />
        <span className="font-display text-sm font-semibold leading-tight">
          Burhaanudeen
          <br />
          <span className="text-xs font-normal text-paper/60">Islamic School</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
        {modules.map((mod) => {
          const Icon = ICONS[MODULE_ICON_KEYS[mod]];
          const active = mod === activeModule;
          return (
            <Link
              key={mod}
              href={moduleHref(mod)}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-emerald-700 text-white" : "text-paper/75 hover:bg-white/5 hover:text-paper"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {MODULE_LABELS[mod]}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
