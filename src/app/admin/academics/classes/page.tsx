import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { ClassesManager } from "@/components/admin/classes-manager";

export const metadata = { title: "Classes" };

export default async function ClassesPage() {
  await requireModuleAccess("academics", "read");

  const [classes, years, teachers] = await Promise.all([
    prisma.class.findMany({
      include: {
        academicYear: { select: { id: true, name: true } },
        classTeacher: { select: { id: true, user: { select: { name: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: [{ level: "asc" }, { name: "asc" }],
    }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
    prisma.staff.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { dateJoined: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Classes</h1>
      <p className="mt-1 text-sm text-ink-soft">Configure classes, capacity, and class teachers.</p>
      <div className="mt-6">
        <ClassesManager
          initialClasses={classes}
          years={years}
          teachers={teachers.map((t) => ({ id: t.id, name: t.user.name }))}
        />
      </div>
    </div>
  );
}
