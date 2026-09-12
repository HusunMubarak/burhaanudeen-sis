import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { CreatePayrollPeriodForm } from "@/components/admin/create-payroll-period-form";

export const metadata = { title: "Payroll" };

const STATUS_TONE: Record<string, "emerald" | "gold" | "muted"> = {
  DRAFT: "muted",
  REVIEW: "gold",
  PROCESSED: "gold",
  PAID: "emerald",
};

export default async function PayrollPage() {
  await requireModuleAccess("payroll", "read");

  const periods = await prisma.payrollPeriod.findMany({
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: { _count: { select: { entries: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Payroll</h1>
          <p className="mt-1 text-sm text-ink-soft">Draft → Review → Process → Paid, one period per month.</p>
        </div>
        <LinkButton href="/admin/payroll/salaries" variant="outline" size="sm">
          Manage Salaries
        </LinkButton>
      </div>

      <div className="mt-6">
        <CreatePayrollPeriodForm />
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/70">
        {periods.length === 0 ? (
          <EmptyState title="No payroll periods yet" description="Create one above to get started." />
        ) : (
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper-dim">
                  <td className="px-4 py-3">
                    <Link href={`/admin/payroll/${p.id}`} className="font-medium text-emerald-800 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p._count.entries}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge>
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
