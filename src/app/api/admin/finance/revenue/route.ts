import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { revenueTransactionSchema } from "@/lib/validation";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("finance", "read");
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
    const pageSize = 20;

    const where = {
      ...(from || to
        ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
        : {}),
    };

    const [total, transactions] = await Promise.all([
      prisma.revenueTransaction.count({ where }),
      prisma.revenueTransaction.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ transactions, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) });
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

    const parsed = revenueTransactionSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const created = await prisma.revenueTransaction.create({
      data: { ...parsed.data, recordedById: session.user.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "RevenueTransaction",
        entityId: created.id,
        metadata: JSON.stringify({ amount: parsed.data.amount }),
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
