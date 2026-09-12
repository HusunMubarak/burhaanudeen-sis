import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "Expense Categories" };

export default async function ExpenseCategoriesPage() {
  await requireModuleAccess("finance", "read");
  const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Expense Categories</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Not hard-coded — add or deactivate categories as the school needs. &quot;Staff Salaries&quot; is created
        automatically the first time payroll is paid, if it doesn&apos;t already exist.
      </p>
      <div className="mt-6">
        <CategoryManager title="Expense" apiBase="/api/admin/finance/expense-categories" initialCategories={categories} />
      </div>
    </div>
  );
}
