import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { AcademicPerformanceReport } from "@/components/admin/academic-performance-report";

export const metadata = { title: "Academic Performance Report" };

export default async function AcademicPerformancePage() {
  await requireModuleAccess("academics", "read");

  const [classes, terms, academicYears] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.term.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, isCurrent: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Academic Performance Report</h1>
      <p className="mt-1 text-sm text-ink-soft">Average subject score by class for a chosen term.</p>
      <div className="mt-6">
        <AcademicPerformanceReport classes={classes} terms={terms} academicYears={academicYears} />
      </div>
    </div>
  );
}
