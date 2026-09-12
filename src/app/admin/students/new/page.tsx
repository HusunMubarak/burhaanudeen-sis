import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { StudentForm } from "@/components/admin/student-form";

export const metadata = { title: "Add Student" };

export default async function NewStudentPage() {
  await requireModuleAccess("students", "write");
  const [classes, years] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Add Student</h1>
      <p className="mt-1 text-sm text-ink-soft">
        For transfers or direct entry. Students who apply online are created automatically at enrollment.
      </p>
      <div className="mt-6 max-w-3xl">
        <StudentForm classes={classes} years={years} />
      </div>
    </div>
  );
}
