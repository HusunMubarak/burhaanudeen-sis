import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { expenseCategorySchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireModuleAccess("finance", "read");
    const categories = await prisma.expenseCategory.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
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

    const parsed = expenseCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a category name." }, { status: 422 });
    }

    const existing = await prisma.expenseCategory.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return NextResponse.json({ error: "An expense category with this name already exists." }, { status: 409 });
    }

    const created = await prisma.expenseCategory.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "ExpenseCategory", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
