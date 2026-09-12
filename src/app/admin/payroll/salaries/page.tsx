import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { SalaryManager } from "@/components/admin/salary-manager";

export const metadata = { title: "Salaries" };

export default async function SalariesPage() {
  await requireModuleAccess("payroll", "read");

  const [staff, salaries] = await Promise.all([
    prisma.staff.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.salary.findMany({
      include: { staff: { select: { id: true, staffNumber: true, user: { select: { name: true } } } } },
      orderBy: { effectiveDate: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Salaries</h1>
      <p className="mt-1 text-sm text-ink-soft">Salary history for every staff member.</p>
      <div className="mt-6">
        <SalaryManager
          staff={staff.map((s) => ({ id: s.id, name: s.user.name }))}
          initialSalaries={salaries.map((s) => ({
            ...s,
            baseSalary: s.baseSalary.toString(),
            effectiveDate: s.effectiveDate.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
