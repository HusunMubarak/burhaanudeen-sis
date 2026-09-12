import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { payrollPeriodSchema } from "@/lib/validation";
import { calculatePayrollEntry } from "@/lib/finance";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export async function GET() {
  try {
    await requireModuleAccess("payroll", "read");
    const periods = await prisma.payrollPeriod.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: { _count: { select: { entries: true } } },
    });
    return NextResponse.json(periods);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("payroll", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = payrollPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Select a valid month and year." }, { status: 422 });
    }

    const existing = await prisma.payrollPeriod.findUnique({
      where: { month_year: { month: parsed.data.month, year: parsed.data.year } },
    });
    if (existing) {
      return NextResponse.json({ error: "A payroll period already exists for this month." }, { status: 409 });
    }

    // Snapshot each active staff member's CURRENT salary (most recent
    // isActive Salary row) — staff with no salary configured yet are
    // skipped and reported back rather than silently defaulting to
    // GHS 0, which would understate payroll without anyone noticing.
    const activeStaff = await prisma.staff.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        user: { select: { name: true } },
        salaries: { where: { isActive: true }, orderBy: { effectiveDate: "desc" }, take: 1 },
      },
    });

    const staffWithSalary = activeStaff.filter((s) => s.salaries.length > 0);
    const skipped = activeStaff.filter((s) => s.salaries.length === 0).map((s) => s.user.name);

    if (staffWithSalary.length === 0) {
      return NextResponse.json(
        { error: "No active staff have a salary configured yet. Add salaries before creating a payroll period." },
        { status: 422 }
      );
    }

    const period = await prisma.$transaction(async (tx) => {
      const created = await tx.payrollPeriod.create({
        data: {
          name: `${MONTH_NAMES[parsed.data.month - 1]} ${parsed.data.year}`,
          month: parsed.data.month,
          year: parsed.data.year,
          status: "DRAFT",
          createdById: session.user.id,
        },
      });

      await tx.payrollEntry.createMany({
        data: staffWithSalary.map((s) => {
          const salary = s.salaries[0];
          const calc = calculatePayrollEntry(Number(salary.baseSalary), 0);
          return {
            payrollPeriodId: created.id,
            staffId: s.id,
            salarySnapshot: salary.baseSalary,
            deductions: calc.deductions,
            grossAmount: calc.gross,
            netAmount: calc.net,
          };
        }),
      });

      return created;
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "PayrollPeriod",
        entityId: period.id,
        metadata: JSON.stringify({ staffCount: staffWithSalary.length, skipped }),
      },
    });

    return NextResponse.json({ period, skipped }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
