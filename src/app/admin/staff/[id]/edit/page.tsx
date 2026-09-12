import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { StaffForm } from "@/components/admin/staff-form";
import type { RoleName } from "@/lib/rbac";

export const metadata = { title: "Edit Staff Member" };

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("staff", "write");
  const { id } = await params;

  const staff = await prisma.staff.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true, roles: { include: { role: true } } } } },
  });

  if (!staff) notFound();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Edit Staff Member</h1>
      <p className="mt-1 text-sm text-ink-soft">{staff.staffNumber}</p>
      <div className="mt-6 max-w-2xl">
        <StaffForm
          initial={{
            id: staff.id,
            name: staff.user.name,
            email: staff.user.email,
            category: staff.category,
            position: staff.position,
            gender: staff.gender,
            phone: staff.phone,
            address: staff.address,
            status: staff.status,
            salaryNote: staff.salaryNote,
            roles: staff.user.roles.map((r) => r.role.name as RoleName),
          }}
        />
      </div>
    </div>
  );
}
