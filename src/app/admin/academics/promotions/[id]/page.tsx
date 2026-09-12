import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { PromotionReviewManager } from "@/components/admin/promotion-review-manager";

export const metadata = { title: "Review Promotion" };

export default async function PromotionBatchPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("academics", "write");
  const { id } = await params;

  const batch = await prisma.promotionBatch.findUnique({
    where: { id },
    include: {
      fromClass: { select: { id: true, name: true, academicYearId: true } },
      toAcademicYear: { select: { id: true, name: true } },
      records: {
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } },
          toClass: { select: { id: true, name: true } },
        },
        orderBy: { student: { lastName: "asc" } },
      },
    },
  });
  if (!batch) notFound();

  const destinationClasses = await prisma.class.findMany({
    where: { academicYearId: batch.toAcademicYearId },
    orderBy: { level: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">
        Promotion: {batch.fromClass.name} → {batch.toAcademicYear.name}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Review each student&apos;s decision, then confirm. Nothing moves until you confirm.
      </p>
      <div className="mt-6">
        <PromotionReviewManager
          batchId={batch.id}
          status={batch.status}
          destinationClasses={destinationClasses}
          initialRecords={batch.records.map((r) => ({
            id: r.id,
            student: r.student,
            decision: r.decision,
            toClassId: r.toClassId,
            toClassName: r.toClass?.name ?? null,
            note: r.note,
          }))}
        />
      </div>
    </div>
  );
}
