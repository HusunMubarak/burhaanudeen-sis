import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { documentSchema } from "@/lib/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("students", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = documentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a document name." }, { status: 422 });
    }

    const student = await prisma.student.findUnique({ where: { id }, select: { id: true } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    const doc = await prisma.studentDocument.create({
      data: { studentId: id, name: parsed.data.name, url: parsed.data.url },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "ADD_DOCUMENT", entity: "Student", entityId: id },
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
