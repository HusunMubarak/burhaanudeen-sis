import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { anyRoleCanAccessModule } from "@/lib/rbac";
import { needsTeacherScoping, getTeacherClassIds } from "@/lib/data/students";

/**
 * One global search across the modules the Phase 5 spec calls out
 * (Students, Staff, Applications, Payments) plus Reports (a static
 * list, matched by title). Each section is only queried — and only
 * returned — if the caller's roles can already read that module, so
 * this never becomes a way to see data a role-scoped page would deny.
 */
export async function GET(req: Request) {
  try {
    const session = await requireModuleAccess("dashboard", "read");
    const roles = session.user.roles ?? [];
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ students: [], staff: [], applications: [], payments: [] });

    // Item 6 (teacher scoping audit): same leak as the /admin/search
    // page — students:read includes Teacher, so without this a
    // Teacher could search every student in the school, not just
    // their own classes.
    const restrictToClassIds = needsTeacherScoping(roles) ? await getTeacherClassIds(session.user.id) : undefined;

    const [students, staff, applications, payments] = await Promise.all([
      anyRoleCanAccessModule(roles, "students")
        ? prisma.student.findMany({
            where: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { admissionNumber: { contains: q, mode: "insensitive" } },
              ],
              ...(restrictToClassIds ? { classId: { in: restrictToClassIds } } : {}),
            },
            select: { id: true, firstName: true, lastName: true, admissionNumber: true },
            take: 8,
          })
        : [],
      anyRoleCanAccessModule(roles, "staff")
        ? prisma.staff.findMany({
            where: {
              OR: [
                { user: { name: { contains: q, mode: "insensitive" } } },
                { staffNumber: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, staffNumber: true, user: { select: { name: true } } },
            take: 8,
          })
        : [],
      anyRoleCanAccessModule(roles, "admissions")
        ? prisma.application.findMany({
            where: {
              OR: [
                { firstName: { contains: q, mode: "insensitive" } },
                { lastName: { contains: q, mode: "insensitive" } },
                { applicationNumber: { contains: q, mode: "insensitive" } },
              ],
            },
            select: { id: true, firstName: true, lastName: true, applicationNumber: true },
            take: 8,
          })
        : [],
      anyRoleCanAccessModule(roles, "finance") || anyRoleCanAccessModule(roles, "fees")
        ? prisma.payment.findMany({
            where: { reference: { contains: q, mode: "insensitive" } },
            select: { id: true, reference: true, amount: true, studentId: true },
            take: 8,
          })
        : [],
    ]);

    return NextResponse.json({ students, staff, applications, payments });
  } catch (err) {
    return authErrorResponse(err);
  }
}
