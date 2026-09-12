import { requireRole } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { STUDENT_EXPORT_ROLES } from "@/lib/rbac";
import { IdCardGenerator } from "@/components/admin/id-card-generator";

export const metadata = { title: "Student ID Cards" };

export default async function IdCardsPage() {
  await requireRole(...STUDENT_EXPORT_ROLES);

  const [classes, students] = await Promise.all([
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.student.findMany({
      where: { status: { in: ["ACTIVE", "ENROLLED"] } },
      orderBy: { lastName: "asc" },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true, classId: true },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Student ID Cards</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Select students and generate printable ID cards — several per A4 page, with photo, class, and academic year.
      </p>
      <div className="mt-6">
        <IdCardGenerator
          classes={classes}
          students={students.map((s) => ({
            id: s.id,
            name: `${s.lastName}, ${s.firstName}`,
            admissionNumber: s.admissionNumber,
            classId: s.classId,
          }))}
        />
      </div>
    </div>
  );
}
