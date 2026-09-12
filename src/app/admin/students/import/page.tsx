import { requireModuleAccess } from "@/lib/authorize";
import { StudentImportWizard } from "@/components/admin/student-import-wizard";

export const metadata = { title: "Import Students" };

export default async function ImportStudentsPage() {
  await requireModuleAccess("students", "write");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Import Students</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload a CSV or Excel file, review the validation results, then confirm to import.
      </p>
      <div className="mt-6 max-w-3xl">
        <StudentImportWizard />
      </div>
    </div>
  );
}
