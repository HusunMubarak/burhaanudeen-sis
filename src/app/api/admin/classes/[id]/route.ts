import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { classSchema } from "@/lib/validation";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("academics", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = classSchema.partial().safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...parsed.data,
        academicYearId: parsed.data.academicYearId ?? undefined,
        classTeacherId: parsed.data.classTeacherId ?? undefined,
      },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "Class", entityId: id },
    });

    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
