import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { feeCategorySchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireModuleAccess("fees", "read");
    const categories = await prisma.feeCategory.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(categories);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("fees", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = feeCategorySchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const existing = await prisma.feeCategory.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return NextResponse.json(
        { error: "A fee category with this name already exists.", fieldErrors: { name: "Already exists" } },
        { status: 409 }
      );
    }

    const created = await prisma.feeCategory.create({ data: parsed.data });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "FeeCategory", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
