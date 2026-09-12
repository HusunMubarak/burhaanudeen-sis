import { requireModuleAccess } from "@/lib/authorize";
import { StaffForm } from "@/components/admin/staff-form";

export const metadata = { title: "Add Staff Member" };

export default async function NewStaffPage() {
  await requireModuleAccess("staff", "write");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Add Staff Member</h1>
      <div className="mt-6 max-w-2xl">
        <StaffForm />
      </div>
    </div>
  );
}
