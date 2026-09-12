import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { getFinanceSummary } from "@/lib/data/finance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Fee Collection Report" };

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FeeCollectionReportPage() {
  await requireModuleAccess("reports", "read");

  const [assignments, summary] = await Promise.all([
    prisma.studentFeeAssignment.findMany({ select: { categoryName: true, amount: true } }),
    getFinanceSummary(),
  ]);

  const byCategory = new Map<string, number>();
  for (const a of assignments) {
    byCategory.set(a.categoryName, (byCategory.get(a.categoryName) ?? 0) + Number(a.amount));
  }
  const rows = Array.from(byCategory.entries())
    .map(([category, expected]) => ({ category, expected }))
    .sort((a, b) => b.expected - a.expected);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Fee Collection Report</h1>
      <p className="mt-1 text-sm text-ink-soft">Expected fees broken down by category, alongside overall collection.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Total Expected</p>
            <p className="mt-1 text-xl font-semibold text-ink">{ghs(summary.totalFeesExpected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Total Collected</p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">{ghs(summary.totalFeesCollected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Collection Rate</p>
            <p className="mt-1 text-xl font-semibold text-ink">{summary.collectionRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Expected Fees by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-ink-soft">No fees have been assigned yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                  <th className="py-2">Category</th>
                  <th className="py-2">Expected</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.category} className="border-b border-line last:border-0">
                    <td className="py-2 font-medium text-ink">{r.category}</td>
                    <td className="py-2">{ghs(r.expected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-4 text-xs text-ink-soft">
            A payment reduces a student&apos;s overall balance rather than being allocated to a specific fee line
            item, so &quot;collected&quot; is only meaningful school-wide (above), not broken down per category
            here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
