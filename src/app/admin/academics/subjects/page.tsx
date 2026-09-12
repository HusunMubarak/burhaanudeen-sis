import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { SubjectsManager } from "@/components/admin/subjects-manager";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  await requireModuleAccess("academics", "read");

  const subjects = await prisma.subject.findMany({
    include: { _count: { select: { classes: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Subjects</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The subject catalogue. Assign subjects to classes on the Assignments page.
      </p>
      <div className="mt-6">
        <SubjectsManager
          initialSubjects={subjects.map((s) => ({
            id: s.id,
            name: s.name,
            code: s.code,
            level: s.level,
            isActive: s.isActive,
            classCount: s._count.classes,
          }))}
        />
      </div>
    </div>
  );
}
