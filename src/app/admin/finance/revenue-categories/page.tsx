import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { CategoryManager } from "@/components/admin/category-manager";

export const metadata = { title: "Revenue Categories" };

export default async function RevenueCategoriesPage() {
  await requireModuleAccess("finance", "read");
  const categories = await prisma.revenueCategory.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Revenue Categories</h1>
      <p className="mt-1 text-sm text-ink-soft">Not hard-coded — add or deactivate categories as the school needs.</p>
      <div className="mt-6">
        <CategoryManager title="Revenue" apiBase="/api/admin/finance/revenue-categories" initialCategories={categories} />
      </div>
    </div>
  );
}
