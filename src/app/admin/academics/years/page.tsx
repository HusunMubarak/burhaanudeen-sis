import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { AcademicYearsManager } from "@/components/admin/academic-years-manager";

export const metadata = { title: "Academic Years" };

export default async function AcademicYearsPage() {
  await requireModuleAccess("academics", "read");

  const years = await prisma.academicYear.findMany({ orderBy: { startDate: "desc" } });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Academic Years</h1>
      <p className="mt-1 text-sm text-ink-soft">Only one academic year can be marked current at a time.</p>
      <div className="mt-6">
        <AcademicYearsManager
          initialYears={years.map((y) => ({
            id: y.id,
            name: y.name,
            startDate: y.startDate.toISOString(),
            endDate: y.endDate.toISOString(),
            isCurrent: y.isCurrent,
          }))}
        />
      </div>
    </div>
  );
}
