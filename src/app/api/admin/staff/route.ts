import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireModuleAccess, authErrorResponse, ForbiddenError } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { staffSchema } from "@/lib/validation";
import { generateStaffNumber } from "@/lib/ids";
import { canGrantRoles } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("staff", "read");
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;

    const staff = await prisma.staff.findMany({
      where: {
        ...(category ? { category: category as never } : {}),
        ...(status ? { status: status as never } : {}),
        ...(q
          ? {
              OR: [
                { staffNumber: { contains: q } },
                { position: { contains: q } },
                { user: { name: { contains: q } } },
                { user: { email: { contains: q } } },
              ],
            }
          : {}),
      },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { dateJoined: "desc" },
    });

    return NextResponse.json(staff);
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireModuleAccess("staff", "write");

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const parsed = staffSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return NextResponse.json({ error: "Please check the form and try again.", fieldErrors }, { status: 422 });
    }

    // A1: real enforcement — see src/lib/rbac.ts#canGrantRoles.
    if (!canGrantRoles(session.user.roles ?? [], parsed.data.roles)) {
      throw new ForbiddenError("You cannot grant a role you do not hold.");
    }

    if (!parsed.data.password) {
      return NextResponse.json(
        { error: "A password is required when creating a new staff account.", fieldErrors: { password: "Required" } },
        { status: 422 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase().trim() } });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists.", fieldErrors: { email: "Already in use" } },
        { status: 409 }
      );
    }

    const staffNumber = await generateStaffNumber();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const roles = await prisma.role.findMany({ where: { name: { in: parsed.data.roles } } });

    const staff = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase().trim(),
          passwordHash,
          roles: { create: roles.map((r) => ({ roleId: r.id })) },
        },
      });

      return tx.staff.create({
        data: {
          userId: user.id,
          staffNumber,
          category: parsed.data.category,
          position: parsed.data.position,
          photoUrl: parsed.data.photoUrl ?? null,
          email: parsed.data.email.toLowerCase().trim(),
          phone: parsed.data.phone,
          address: parsed.data.address,
          gender: parsed.data.gender ?? "",
          dateJoined: parsed.data.dateJoined ?? new Date(),
          status: parsed.data.status ?? "ACTIVE",
          salaryNote: parsed.data.salaryNote,
        },
        include: { user: { select: { name: true, email: true } } },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "CREATE",
        entity: "Staff",
        entityId: staff.id,
        metadata: JSON.stringify({ staffNumber }),
      },
    });

    return NextResponse.json(staff, { status: 201 });
  } catch (err) {
    return authErrorResponse(err);
  }
}
