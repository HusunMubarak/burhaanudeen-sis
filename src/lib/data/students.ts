import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma, StudentStatus } from "@prisma/client";

export type StudentListParams = {
  q?: string;
  classId?: string;
  status?: string;
  academicYearId?: string;
  sort?: "name" | "admissionNumber" | "createdAt";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  /**
   * B1: when set, results are restricted to these class IDs regardless
   * of any other filter — used to scope a Teacher's view to only the
   * classes where they are the assigned class teacher. An empty array
   * (not undefined) means "restricted to nothing", e.g. a teacher with
   * no assigned classes sees an empty list, never the whole school.
   */
  restrictToClassIds?: string[];
};

const SORT_FIELD: Record<NonNullable<StudentListParams["sort"]>, string> = {
  name: "lastName",
  admissionNumber: "admissionNumber",
  createdAt: "createdAt",
};

export async function listStudents(params: StudentListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const sortField = SORT_FIELD[params.sort ?? "name"];
  const dir = params.dir ?? "asc";

  const where: Prisma.StudentWhereInput = {
    ...(params.classId ? { classId: params.classId } : {}),
    ...(params.status ? { status: params.status as StudentStatus } : {}),
    ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
    ...(params.restrictToClassIds ? { classId: { in: params.restrictToClassIds } } : {}),
    ...(params.q
      ? {
          OR: [
            { firstName: { contains: params.q, mode: "insensitive" } },
            { lastName: { contains: params.q, mode: "insensitive" } },
            { admissionNumber: { contains: params.q, mode: "insensitive" } },
            { guardianPhone: { contains: params.q } },
          ],
        }
      : {}),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: { [sortField]: dir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { class: { select: { id: true, name: true } }, academicYear: { select: { id: true, name: true } } },
    }),
  ]);

  return { students, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * B1: roles that see the full school roster without class scoping.
 * Anyone else with student-module access (i.e. Teachers) is scoped to
 * their own classes — see getTeacherClassIds below.
 */
const UNRESTRICTED_STUDENT_ROLES = ["SUPER_ADMIN", "PROPRIETOR", "HEADTEACHER", "ADMISSIONS_OFFICER"] as const;

export function needsTeacherScoping(roles: string[]): boolean {
  return !roles.some((r) => (UNRESTRICTED_STUDENT_ROLES as readonly string[]).includes(r));
}

/** Class IDs where the given user is the assigned class teacher. */
export async function getTeacherClassIds(userId: string): Promise<string[]> {
  const staff = await prisma.staff.findUnique({ where: { userId }, select: { id: true } });
  if (!staff) return [];
  const classes = await prisma.class.findMany({ where: { classTeacherId: staff.id }, select: { id: true } });
  return classes.map((c) => c.id);
}
