import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { TermsManager } from "@/components/admin/terms-manager";

export const metadata = { title: "Terms" };

export default async function TermsPage() {
  await requireModuleAccess("academics", "read");

  const [terms, years] = await Promise.all([
    prisma.term.findMany({
      include: { academicYear: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" },
    }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Terms</h1>
      <p className="mt-1 text-sm text-ink-soft">Only one term per academic year can be marked current.</p>
      <div className="mt-6">
        <TermsManager
          initialTerms={terms.map((t) => ({
            id: t.id,
            name: t.name,
            startDate: t.startDate.toISOString(),
            endDate: t.endDate.toISOString(),
            isCurrent: t.isCurrent,
            academicYearId: t.academicYearId,
            academicYear: t.academicYear,
          }))}
          years={years}
        />
      </div>
    </div>
  );
}
