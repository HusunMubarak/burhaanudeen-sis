import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { TransactionManager } from "@/components/admin/transaction-manager";

export const metadata = { title: "Expenses" };

export default async function ExpensesPage() {
  await requireModuleAccess("finance", "read");

  const [expenses, categories] = await Promise.all([
    prisma.expense.findMany({
      include: { category: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.expenseCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Expenses</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Salaries, utilities, rent and other outgoings. Staff salary expenses are created automatically when
            payroll is marked paid — see the Payroll module.
          </p>
        </div>
        <Link href="/admin/finance/expense-categories" className="text-sm text-emerald-700 hover:underline">
          Manage categories
        </Link>
      </div>
      <div className="mt-6">
        <TransactionManager
          apiBase="/api/admin/finance/expenses"
          categories={categories}
          initialTransactions={expenses.map((e) => ({ ...e, date: e.date.toISOString(), amount: e.amount.toString() }))}
          initialTotal={total}
          showReceiptUrl
        />
      </div>
    </div>
  );
}
