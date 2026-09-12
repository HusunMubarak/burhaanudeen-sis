import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { canTransitionPayrollPeriod, sumPayrollNet, PAYROLL_EXPENSE_CATEGORY, type PayrollPeriodStatus } from "@/lib/finance";
import { z } from "zod";

const transitionSchema = z.object({ status: z.enum(["REVIEW", "PROCESSED", "PAID"]) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("payroll", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = transitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid status." }, { status: 422 });
    }

    const period = await prisma.payrollPeriod.findUnique({
      where: { id },
      include: { entries: true, expense: true },
    });
    if (!period) return NextResponse.json({ error: "Payroll period not found." }, { status: 404 });

    if (!canTransitionPayrollPeriod(period.status as PayrollPeriodStatus, parsed.data.status)) {
      return NextResponse.json(
        { error: `Cannot move this payroll period from ${period.status} to ${parsed.data.status}.` },
        { status: 409 }
      );
    }

    if (period.entries.length === 0) {
      return NextResponse.json({ error: "This payroll period has no entries." }, { status: 422 });
    }

    // PAID is the critical transition: it must atomically (a) flip
    // the period's status and (b) book exactly one expense for the
    // total net payout, category "Staff Salaries" — never two
    // contradictory totals. The unique payrollPeriodId on Expense
    // plus this idempotency check means calling PAID twice can never
    // double-book the expense.
    if (parsed.data.status === "PAID") {
      if (period.expense) {
        return NextResponse.json({ error: "This payroll period has already been paid." }, { status: 409 });
      }

      const salariesCategory = await prisma.expenseCategory.upsert({
        where: { name: PAYROLL_EXPENSE_CATEGORY },
        update: {},
        create: { name: PAYROLL_EXPENSE_CATEGORY },
      });

      const totalNet = sumPayrollNet(period.entries.map((e) => ({ netAmount: Number(e.netAmount) })));

      const [updatedPeriod] = await prisma.$transaction([
        prisma.payrollPeriod.update({ where: { id }, data: { status: "PAID", paidAt: new Date() } }),
        prisma.expense.create({
          data: {
            categoryId: salariesCategory.id,
            date: new Date(),
            amount: totalNet,
            description: `Staff salaries — ${period.name}`,
            method: "BANK",
            recordedById: session.user.id,
            payrollPeriodId: id,
          },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: "PAYROLL_PAID",
          entity: "PayrollPeriod",
          entityId: id,
          metadata: JSON.stringify({ totalNet, entriesCount: period.entries.length }),
        },
      });

      return NextResponse.json(updatedPeriod);
    }

    const updated = await prisma.payrollPeriod.update({
      where: { id },
      data: { status: parsed.data.status, ...(parsed.data.status === "PROCESSED" ? { processedAt: new Date() } : {}) },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "PAYROLL_STATUS_CHANGE",
        entity: "PayrollPeriod",
        entityId: id,
        metadata: JSON.stringify({ from: period.status, to: parsed.data.status }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
