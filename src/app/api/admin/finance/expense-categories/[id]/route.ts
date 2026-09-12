import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { expenseCategorySchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("finance", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = expenseCategorySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please check the form and try again." }, { status: 422 });
    }

    const updated = await prisma.expenseCategory.update({ where: { id }, data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "ExpenseCategory", entityId: id },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
