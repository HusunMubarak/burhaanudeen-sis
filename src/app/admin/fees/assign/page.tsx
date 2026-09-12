import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { AssignFeesForm } from "@/components/admin/assign-fees-form";

export const metadata = { title: "Assign Fees" };

export default async function AssignFeesPage() {
  await requireModuleAccess("fees", "read");

  const [years, terms, classes] = await Promise.all([
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.term.findMany({ select: { id: true, name: true, academicYearId: true } }),
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Assign Fees</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Bulk-assign every matching active fee structure to every active student in a class. Students already
        assigned a given fee line item are left untouched — this never creates a duplicate charge.
      </p>
      <div className="mt-6 max-w-lg">
        <AssignFeesForm years={years} terms={terms} classes={classes} />
      </div>
    </div>
  );
}
