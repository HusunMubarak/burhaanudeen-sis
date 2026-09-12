import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { FeeStructuresManager } from "@/components/admin/fee-structures-manager";

export const metadata = { title: "Fee Structures" };

export default async function FeeStructuresPage() {
  await requireModuleAccess("fees", "read");

  const [structures, years, terms, classes, categories] = await Promise.all([
    prisma.feeStructure.findMany({
      include: {
        academicYear: { select: { name: true } },
        term: { select: { name: true } },
        class: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: [{ academicYear: { startDate: "desc" } }, { category: { name: "asc" } }],
    }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.term.findMany({ select: { id: true, name: true, academicYearId: true } }),
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.feeCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Fee Structures</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Configure the expected fee per academic year, term, class and category. Amounts are snapshotted when
        assigned to a student, so editing here never changes what an already-assigned student owes.
      </p>
      <div className="mt-6">
        <FeeStructuresManager
          initialStructures={structures.map((s) => ({ ...s, amount: s.amount.toString() }))}
          years={years}
          terms={terms}
          classes={classes}
          categories={categories}
        />
      </div>
    </div>
  );
}
