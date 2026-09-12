import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { PromotionsManager } from "@/components/admin/promotions-manager";

export const metadata = { title: "Student Promotion" };

export default async function PromotionsPage() {
  await requireModuleAccess("academics", "write");

  const [classes, academicYears, batches] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.promotionBatch.findMany({
      include: {
        fromClass: { select: { name: true } },
        toAcademicYear: { select: { name: true } },
        _count: { select: { records: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Student Promotion</h1>
      <p className="mt-1 text-sm text-ink-soft">Prepare a batch, review each student&apos;s decision, then confirm.</p>
      <div className="mt-6">
        <PromotionsManager
          classes={classes}
          academicYears={academicYears}
          initialBatches={batches.map((b) => ({
            id: b.id,
            fromClassName: b.fromClass.name,
            toYearName: b.toAcademicYear.name,
            status: b.status,
            recordCount: b._count.records,
          }))}
        />
      </div>
    </div>
  );
}
