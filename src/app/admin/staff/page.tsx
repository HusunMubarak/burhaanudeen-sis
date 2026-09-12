import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Staff" };

const STATUS_TONE: Record<string, "emerald" | "gold" | "muted"> = {
  ACTIVE: "emerald",
  INACTIVE: "muted",
  RESIGNED: "muted",
  TERMINATED: "muted",
  RETIRED: "gold",
};

const CATEGORY_LABELS: Record<string, string> = {
  TEACHING: "Teaching",
  NON_TEACHING: "Non-Teaching",
  MANAGEMENT: "Management",
};

export default async function StaffPage() {
  await requireModuleAccess("staff", "read");

  const staff = await prisma.staff.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { dateJoined: "desc" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Staff</h1>
          <p className="mt-1 text-sm text-ink-soft">{staff.length} staff member{staff.length === 1 ? "" : "s"} on record.</p>
        </div>
        <LinkButton href="/admin/staff/new" size="sm">
          Add Staff Member
        </LinkButton>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/70">
        {staff.length === 0 ? (
          <EmptyState
            title="No staff yet"
            description="Add your first staff member to get started."
            action={<LinkButton href="/admin/staff/new">Add Staff Member</LinkButton>}
          />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Staff No.</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper-dim">
                  <td className="px-4 py-3 font-mono-label text-xs text-ink-soft">{s.staffNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/staff/${s.id}/edit`} className="font-medium text-emerald-800 hover:underline">
                      {s.user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.position}</td>
                  <td className="px-4 py-3">{CATEGORY_LABELS[s.category]}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[s.status] ?? "muted"}>{s.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
