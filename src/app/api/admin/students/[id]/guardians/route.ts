import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { guardianLinkSchema } from "@/lib/validation";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("students", "read");
    const { id } = await params;
    const guardians = await prisma.guardian.findMany({
      where: { studentId: id },
      include: { user: { select: { id: true, name: true, email: true, isActive: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(guardians);
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** Links a parent account to this student — creating the account
 * first if it doesn't exist yet. This is the only way a Guardian row
 * (the parent portal's actual security boundary) gets created, and
 * it's deliberately admin-only: a parent can never self-enroll access
 * to a child's record. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("students", "write");
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = guardianLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form." }, { status: 422 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      if (parsed.data.mode === "existing") {
        return NextResponse.json({ error: "No account exists with that email — switch to \"Create new account\"." }, { status: 404 });
      }
      if (!parsed.data.password) {
        return NextResponse.json({ error: "Set a password for the new parent account." }, { status: 422 });
      }
      const parentRole = await prisma.role.findUnique({ where: { name: "PARENT" } });
      if (!parentRole) {
        return NextResponse.json({ error: "The PARENT role is not seeded — run the database seed first." }, { status: 500 });
      }
      const passwordHash = await bcrypt.hash(parsed.data.password, 12);
      user = await prisma.user.create({
        data: {
          email,
          name: parsed.data.name || email,
          passwordHash,
          isActive: true,
          roles: { create: { roleId: parentRole.id } },
        },
      });
    } else {
      const hasParentRole = await prisma.userRole.findFirst({
        where: { userId: user.id, role: { name: "PARENT" } },
      });
      if (!hasParentRole) {
        const parentRole = await prisma.role.findUnique({ where: { name: "PARENT" } });
        if (parentRole) await prisma.userRole.create({ data: { userId: user.id, roleId: parentRole.id } });
      }
    }

    const guardian = await prisma.guardian.upsert({
      where: { userId_studentId: { userId: user.id, studentId } },
      update: { relationship: parsed.data.relationship ?? "Parent/Guardian" },
      create: { userId: user.id, studentId, relationship: parsed.data.relationship ?? "Parent/Guardian" },
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "CREATE", entity: "Guardian", entityId: guardian.id, metadata: JSON.stringify({ studentId, parentEmail: email }) },
    });

    return NextResponse.json({ ok: true, guardianId: guardian.id }, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
