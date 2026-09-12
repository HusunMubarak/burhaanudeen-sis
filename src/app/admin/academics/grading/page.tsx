import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { GradingManager } from "@/components/admin/grading-manager";

export const metadata = { title: "Grading Scale" };

export default async function GradingPage() {
  await requireModuleAccess("academics", "read");

  const scales = await prisma.gradeScale.findMany({ orderBy: { minScore: "asc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Grading Scale</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Define the score bands used to grade every result and report card. Bands should not overlap.
      </p>
      <div className="mt-6">
        <GradingManager
          initialScales={scales.map((s) => ({
            id: s.id,
            minScore: Number(s.minScore),
            maxScore: Number(s.maxScore),
            grade: s.grade,
            remark: s.remark,
            isActive: s.isActive,
          }))}
        />
      </div>
    </div>
  );
}
