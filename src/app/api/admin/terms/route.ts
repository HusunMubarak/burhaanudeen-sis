import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { termSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireModuleAccess("academics", "read");
    const terms = await prisma.term.findMany({
      include: { academicYear: { select: { id: true, name: true } } },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(terms);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("academics", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = termSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const created = await prisma.$transaction(async (tx) => {
      if (parsed.data.isCurrent) {
        await tx.term.updateMany({
          where: { academicYearId: parsed.data.academicYearId, isCurrent: true },
          data: { isCurrent: false },
        });
      }
      return tx.term.create({ data: parsed.data });
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "Term", entityId: created.id },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
