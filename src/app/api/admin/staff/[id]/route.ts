import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireModuleAccess, authErrorResponse, ForbiddenError } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { staffSchema } from "@/lib/validation";
import { canGrantRoles } from "@/lib/rbac";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireModuleAccess("staff", "read");
    const { id } = await params;

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, roles: { include: { role: true } } } },
        classesLed: { select: { id: true, name: true } },
      },
    });

    if (!staff) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
    return NextResponse.json(staff);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireModuleAccess("staff", "write");
    const { id } = await params;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = staffSchema.partial().safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    // A1: the real enforcement point — never trust the client to have
    // hidden the option. A caller can only grant roles they themselves
    // hold, and only an existing Super Admin can grant Super Admin.
    if (parsed.data.roles && !canGrantRoles(session.user.roles ?? [], parsed.data.roles)) {
      throw new ForbiddenError("You cannot grant a role you do not hold.");
    }

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) return NextResponse.json({ error: "Staff member not found." }, { status: 404 });

    const { name, password, roles, email, ...staffFields } = parsed.data;

    await prisma.$transaction(async (tx) => {
      // A2: staff status is the source of truth for login eligibility —
      // keep User.isActive in lockstep so a status change takes effect
      // immediately, not just via the (separate) staff.status check.
      const userUpdate: { name?: string; email?: string; passwordHash?: string; isActive?: boolean } = {
        ...(name ? { name } : {}),
        ...(email ? { email: email.toLowerCase().trim() } : {}),
        ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
        ...(staffFields.status ? { isActive: staffFields.status === "ACTIVE" } : {}),
      };
      if (Object.keys(userUpdate).length > 0) {
        await tx.user.update({ where: { id: staff.userId }, data: userUpdate });
      }
      if (roles) {
        const roleRows = await tx.role.findMany({ where: { name: { in: roles } } });
        await tx.userRole.deleteMany({ where: { userId: staff.userId } });
        await tx.userRole.createMany({ data: roleRows.map((r) => ({ userId: staff.userId, roleId: r.id })) });
      }
      await tx.staff.update({
        where: { id },
        data: { ...staffFields, ...(email ? { email: email.toLowerCase().trim() } : {}) },
      });
    });

    await prisma.auditLog.create({
      data: { userId: session.user.id, action: "UPDATE", entity: "Staff", entityId: id },
    });

    const updated = await prisma.staff.findUnique({ where: { id }, include: { user: { select: { name: true, email: true } } } });
    return NextResponse.json(updated);
  } catch (err) {
    return authErrorResponse(err);
  }
}
