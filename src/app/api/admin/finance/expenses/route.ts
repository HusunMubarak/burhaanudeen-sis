import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { expenseSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("finance", "read");
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const categoryId = url.searchParams.get("categoryId") ?? undefined;
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = 20;

    const where = {
      ...(categoryId ? { categoryId } : {}),
      ...(from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    const [total, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        include: { category: { select: { id: true, name: true } }, payrollPeriod: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ expenses, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("finance", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    // payrollPeriodId is never accepted from the client — it's only
    // ever set internally when a payroll run is marked PAID (see
    // the payroll-periods/[id]/transition route).
    const created = await prisma.expense.create({
      data: {
        categoryId: parsed.data.categoryId,
        date: parsed.data.date,
        amount: parsed.data.amount,
        description: parsed.data.description,
        method: parsed.data.method,
        reference: parsed.data.reference,
        receiptUrl: parsed.data.receiptUrl || null,
        recordedById: session.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Expense",
        entityId: created.id,
        metadata: JSON.stringify({ amount: parsed.data.amount, categoryId: parsed.data.categoryId }),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
