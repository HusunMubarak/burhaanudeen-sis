import { requireModuleAccess } from "@/lib/authorize";
import { StudentsReportPanel } from "@/components/admin/students-report-panel";

export const metadata = { title: "Student Reports" };

export default async function StudentReportsPage() {
  await requireModuleAccess("reports", "read");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Student Reports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        All students, by class, by gender, new admissions, withdrawals, and graduates — export as PDF, Excel, or CSV.
      </p>
      <div className="mt-6">
        <StudentsReportPanel />
      </div>
    </div>
  );
}
