import { requireModuleAccess } from "@/lib/authorize";
import { AdmissionsReportPanel } from "@/components/admin/admissions-report-panel";

export const metadata = { title: "Admissions Reports" };

export default async function AdmissionsReportsPage() {
  await requireModuleAccess("reports", "read");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Admissions Reports</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Applications, pending and verified payments, accepted, rejected, and enrolled — export as PDF, Excel, or CSV.
      </p>
      <div className="mt-6">
        <AdmissionsReportPanel />
      </div>
    </div>
  );
}
