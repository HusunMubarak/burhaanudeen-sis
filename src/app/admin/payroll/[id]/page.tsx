import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { PayrollEntryRow, PayrollTransitionButton } from "@/components/admin/payroll-actions";

export const metadata = { title: "Payroll Period" };

const STATUS_TONE: Record<string, "emerald" | "gold" | "muted"> = {
  DRAFT: "muted",
  REVIEW: "gold",
  PROCESSED: "gold",
  PAID: "emerald",
};

const NEXT_STEP: Record<string, { status: string; label: string } | null> = {
  DRAFT: { status: "REVIEW", label: "Move to Review" },
  REVIEW: { status: "PROCESSED", label: "Process Payroll" },
  PROCESSED: { status: "PAID", label: "Mark as Paid" },
  PAID: null,
};

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PayrollPeriodPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("payroll", "read");
  const { id } = await params;

  const period = await prisma.payrollPeriod.findUnique({
    where: { id },
    include: {
      entries: {
        include: { staff: { select: { id: true, staffNumber: true, position: true, user: { select: { name: true } } } } },
        orderBy: { staff: { user: { name: "asc" } } },
      },
      expense: true,
    },
  });

  if (!period) notFound();

  const totalGross = period.entries.reduce((sum, e) => sum + Number(e.grossAmount), 0);
  const totalDeductions = period.entries.reduce((sum, e) => sum + Number(e.deductions), 0);
  const totalNet = period.entries.reduce((sum, e) => sum + Number(e.netAmount), 0);
  const editable = period.status === "DRAFT" || period.status === "REVIEW";
  const next = NEXT_STEP[period.status];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{period.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge tone={STATUS_TONE[period.status]}>{period.status}</Badge>
            <span className="text-sm text-ink-soft">{period.entries.length} staff</span>
          </div>
        </div>
        {next && <PayrollTransitionButton periodId={period.id} targetStatus={next.status} label={next.label} />}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Total Gross</p>
            <p className="mt-1 text-xl font-semibold text-ink">{ghs(totalGross)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Total Deductions</p>
            <p className="mt-1 text-xl font-semibold text-gold-600">{ghs(totalDeductions)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Total Net (Paid Out)</p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">{ghs(totalNet)}</p>
          </CardContent>
        </Card>
      </div>

      {period.expense && (
        <div className="mt-4 rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
          Booked as expense &quot;{period.expense.description}&quot; on {new Date(period.expense.date).toLocaleDateString("en-GB")} —{" "}
          {ghs(Number(period.expense.amount))}.
        </div>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                  <th className="px-4 py-3">Staff</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Deductions</th>
                  <th className="px-4 py-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {period.entries.map((e) => (
                  <PayrollEntryRow
                    key={e.id}
                    periodId={period.id}
                    editable={editable}
                    entry={{
                      id: e.id,
                      deductions: e.deductions.toString(),
                      grossAmount: e.grossAmount.toString(),
                      netAmount: e.netAmount.toString(),
                      staff: e.staff,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
