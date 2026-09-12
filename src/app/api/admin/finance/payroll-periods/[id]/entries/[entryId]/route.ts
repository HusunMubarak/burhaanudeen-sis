import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { payrollEntryUpdateSchema } from "@/lib/validation";
import { calculatePayrollEntry } from "@/lib/finance";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const session = await requireModuleAccess("payroll", "write");
    const { id, entryId } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = payrollEntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid deduction amount." }, { status: 422 });
    }

    const entry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: { payrollPeriod: { select: { id: true, status: true } } },
    });
    if (!entry || entry.payrollPeriodId !== id) {
      return NextResponse.json({ error: "Payroll entry not found." }, { status: 404 });
    }

    // Deductions can only change while the period is still being put
    // together — once REVIEWed into PROCESSED/PAID, the numbers are
    // final (matching the Draft -> Review -> Process -> Paid workflow;
    // editing after processing would desync the linked expense).
    if (entry.payrollPeriod.status === "PROCESSED" || entry.payrollPeriod.status === "PAID") {
      return NextResponse.json({ error: "This payroll period has already been processed and can no longer be edited." }, { status: 409 });
    }

    const calc = calculatePayrollEntry(Number(entry.salarySnapshot), parsed.data.deductions);

    const updated = await prisma.payrollEntry.update({
      where: { id: entryId },
      data: { deductions: calc.deductions, grossAmount: calc.gross, netAmount: calc.net },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE",
        entity: "PayrollEntry",
        entityId: entryId,
        metadata: JSON.stringify({ deductions: calc.deductions, net: calc.net }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
