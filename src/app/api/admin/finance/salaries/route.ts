import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { salarySchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("payroll", "read");
    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId") ?? undefined;

    const salaries = await prisma.salary.findMany({
      where: { ...(staffId ? { staffId } : {}) },
      include: { staff: { select: { id: true, staffNumber: true, user: { select: { name: true } } } } },
      orderBy: { effectiveDate: "desc" },
    });

    return NextResponse.json(salaries);
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

    const parsed = salarySchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const staff = await prisma.staff.findUnique({ where: { id: parsed.data.staffId }, select: { id: true } });
    if (!staff) {
      return NextResponse.json({ error: "Staff member not found.", fieldErrors: { staffId: "Not found" } }, { status: 404 });
    }

    // A new salary record supersedes the previous one rather than
    // editing it — salary HISTORY is preserved, never overwritten
    // (spec: "Salary changes" are explicitly audited, and the point
    // of a history is that old values stay visible).
    const created = await prisma.$transaction(async (tx) => {
      await tx.salary.updateMany({ where: { staffId: parsed.data.staffId, isActive: true }, data: { isActive: false } });
      return tx.salary.create({
        data: {
          staffId: parsed.data.staffId,
          salaryType: parsed.data.salaryType,
          baseSalary: parsed.data.baseSalary,
          effectiveDate: parsed.data.effectiveDate,
          isActive: true,
          createdById: session.user.id,
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "SALARY_CHANGE",
        entity: "Staff",
        entityId: parsed.data.staffId,
        metadata: JSON.stringify({ baseSalary: parsed.data.baseSalary, salaryType: parsed.data.salaryType }),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
