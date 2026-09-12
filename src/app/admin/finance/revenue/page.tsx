import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { TransactionManager } from "@/components/admin/transaction-manager";

export const metadata = { title: "Revenue" };

export default async function RevenuePage() {
  await requireModuleAccess("finance", "read");

  const [transactions, categories] = await Promise.all([
    prisma.revenueTransaction.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.revenueCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Revenue</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Non-fee income — admission forms, registration, and anything else outside the student fee ledger.
          </p>
        </div>
        <Link href="/admin/finance/revenue-categories" className="text-sm text-emerald-700 hover:underline">
          Manage categories
        </Link>
      </div>
      <div className="mt-6">
        <TransactionManager
          apiBase="/api/admin/finance/revenue"
          categories={categories}
          initialTransactions={transactions.map((t) => ({ ...t, date: t.date.toISOString(), amount: t.amount.toString() }))}
          initialTotal={total}
        />
      </div>
    </div>
  );
}
