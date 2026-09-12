import type { RoleName } from "@/lib/rbac";

/**
 * Roles that see/manage academics without any per-class or
 * per-subject scoping. Everyone else (i.e. Teachers) is scoped down
 * to the classes/subjects they are actually assigned to — see
 * requireAttendanceAccessForClass and requireResultsAccessForClassSubject
 * in lib/academics/authorize.ts. Same pattern as
 * UNRESTRICTED_STUDENT_ROLES in src/lib/data/students.ts.
 *
 * Kept in its own file (no "server-only", no Prisma import) so it's
 * directly unit-testable — same reasoning as src/lib/students.ts.
 */
const UNRESTRICTED_ACADEMICS_ROLES: RoleName[] = ["SUPER_ADMIN", "PROPRIETOR", "HEADTEACHER"];

export function isUnrestrictedAcademics(roles: RoleName[]): boolean {
  return roles.some((r) => (UNRESTRICTED_ACADEMICS_ROLES as string[]).includes(r));
}
