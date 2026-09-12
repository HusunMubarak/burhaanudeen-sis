import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "Fee Categories" };

export default async function FeeCategoriesPage() {
  await requireModuleAccess("fees", "read");
  const categories = await prisma.feeCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Fee Categories</h1>
      <p className="mt-1 text-sm text-ink-soft">Not hard-coded — add or deactivate categories as the school needs.</p>
      <div className="mt-6">
        <CategoryManager
          title="Fee"
          apiBase="/api/admin/finance/fee-categories"
          initialCategories={categories}
          withDescription
        />
      </div>
    </div>
  );
}
