import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession, guardianStudentIds } from "@/lib/authorize";
import { getSchoolSettings } from "@/lib/data/settings";
import { StarMark } from "@/components/ui/star-mark";
import { NotificationBell } from "@/components/notification-bell";
import { SignOutButton } from "@/components/site/sign-out-button";

export const metadata = { title: { template: "%s | Parent Portal", default: "Parent Portal" } };

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const settings = await getSchoolSettings();

  // Phase 5 review fix: /parent is for guardians. A staff member who
  // is not also linked as a guardian (no Guardian rows) and isn't a
  // parent-only account has nothing to do here — send them back to
  // /admin rather than showing an empty "My Children" page. A staff
  // member who *is* also linked as a guardian (e.g. a teacher whose
  // own child attends the school) keeps access, same as a
  // PARENT-only account with no children linked yet (which stays on
  // this page to see the "no children linked" empty state).
  const roles = session.user.roles ?? [];
  const isParentOnly = roles.length > 0 && roles.every((r) => r === "PARENT");
  if (!isParentOnly) {
    const studentIds = await guardianStudentIds(session.user.id);
    if (studentIds.length === 0) redirect("/admin");
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <Link href="/parent" className="flex items-center gap-2.5">
          <StarMark className="h-7 w-7" />
          <div>
            <p className="font-display text-sm font-semibold text-emerald-900">{settings.name}</p>
            <p className="text-xs text-ink-soft">Parent Portal</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="hidden text-sm text-ink-soft sm:inline">{session.user.name ?? session.user.email ?? "Parent"}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
