import Link from "next/link";
import { Wallet, TrendingUp, TrendingDown, Scale, PiggyBank, Receipt } from "lucide-react";
import { requireModuleAccess } from "@/lib/authorize";
import { getFinanceSummary, getMonthlyTrend, getExpensesByCategory } from "@/lib/data/finance";
import { Card, CardContent } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { FinanceCharts } from "@/components/admin/finance-charts";

export const metadata = { title: "Finance" };

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireModuleAccess("finance", "read");
  const sp = await searchParams;
  const range = { ...(sp.from ? { from: new Date(sp.from) } : {}), ...(sp.to ? { to: new Date(sp.to) } : {}) };

  const [summary, monthlyTrend, expensesByCategory] = await Promise.all([
    getFinanceSummary(range),
    getMonthlyTrend(6),
    getExpensesByCategory(range),
  ]);

  const cards = [
    { icon: Wallet, label: "Total Fees Expected", value: summary.totalFeesExpected, tone: "ink" },
    { icon: Wallet, label: "Total Fees Collected", value: summary.totalFeesCollected, tone: "emerald" },
    { icon: Scale, label: "Outstanding Fees", value: summary.outstandingFees, tone: "gold" },
    { icon: TrendingUp, label: "Collection Rate", value: `${summary.collectionRate}%`, tone: "ink", isText: true },
    { icon: PiggyBank, label: "Other Revenue", value: summary.otherRevenue, tone: "ink" },
    { icon: TrendingUp, label: "Total Revenue", value: summary.totalRevenue, tone: "emerald" },
    { icon: TrendingDown, label: "Total Expenses", value: summary.totalExpenses, tone: "gold" },
    { icon: Receipt, label: "Salaries Paid", value: summary.salariesPaid, tone: "ink" },
    { icon: Receipt, label: "Other Expenses", value: summary.otherExpenses, tone: "ink" },
    {
      icon: Scale,
      label: "Net Operating Balance",
      value: summary.netOperatingBalance,
      tone: summary.netOperatingBalance >= 0 ? "emerald" : "danger",
    },
  ];

  const toneClass: Record<string, string> = {
    ink: "text-ink",
    emerald: "text-emerald-700",
    gold: "text-gold-600",
    danger: "text-red-700",
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Finance Dashboard</h1>
          <p className="mt-1 text-sm text-ink-soft">School-wide revenue, expenses and fee collection.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/fees/owing" variant="outline" size="sm">
            Students Owing
          </LinkButton>
          <LinkButton href="/admin/finance/revenue" variant="outline" size="sm">
            Revenue
          </LinkButton>
          <LinkButton href="/admin/finance/expenses" variant="outline" size="sm">
            Expenses
          </LinkButton>
          <LinkButton href="/admin/payroll" size="sm">
            Payroll
          </LinkButton>
        </div>
      </div>

      <form className="mt-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="mb-1 block text-xs text-ink-soft" htmlFor="from">From</label>
          <input type="date" id="from" name="from" defaultValue={sp.from ?? ""} className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-ink-soft" htmlFor="to">To</label>
          <input type="date" id="to" name="to" defaultValue={sp.to ?? ""} className="rounded-md border border-line bg-white px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-md bg-emerald-700 px-4 py-1.5 text-sm font-medium text-paper hover:bg-emerald-900">
          Filter
        </button>
        {(sp.from || sp.to) && (
          <Link href="/admin/finance" className="text-sm text-ink-soft hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="py-5">
              <c.icon className="h-5 w-5 text-emerald-700" />
              <p className={`mt-3 text-xl font-semibold ${toneClass[c.tone]}`}>
                {c.isText ? c.value : ghs(Number(c.value))}
              </p>
              <p className="mt-1 text-xs text-ink-soft">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <FinanceCharts monthlyTrend={monthlyTrend} expensesByCategory={expensesByCategory} />
      </div>
    </div>
  );
}
