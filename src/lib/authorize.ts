import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anyRoleCanAccessModule, type AccessLevel, type ModuleName, type RoleName } from "@/lib/rbac";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Require an authenticated session. Throws UnauthorizedError otherwise.
 * Use at the top of every API route / server action that touches
 * non-public data — never rely on the client to hide a button.
 *
 * A3: the JWT's `roles` claim is only refreshed on next login, so it's
 * treated as a UX hint for the sidebar/proxy redirect only — every
 * authorization decision here re-reads current roles and active status
 * from the database, so a role change or deactivation takes effect on
 * the very next request, not the next login.
 *
 * A2: if the user has a staff profile, that profile's own status must
 * also be ACTIVE — a resigned/terminated/retired staff member is
 * locked out even if their User row was never explicitly deactivated.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isActive: true,
      roles: { select: { role: { select: { name: true } } } },
      staffProfile: { select: { status: true } },
    },
  });

  if (!user || !user.isActive) throw new UnauthorizedError();
  if (user.staffProfile && user.staffProfile.status !== "ACTIVE") throw new UnauthorizedError();

  const roles = user.roles.map((r) => r.role.name) as RoleName[];

  return {
    ...session,
    user: { ...session.user, roles },
  };
}

/** Require the session user to hold at least one of the given roles. */
export async function requireRole(...roles: RoleName[]) {
  const session = await requireSession();
  const userRoles = session.user.roles ?? [];
  const ok = userRoles.includes("SUPER_ADMIN") || userRoles.some((r) => roles.includes(r));
  if (!ok) throw new ForbiddenError();
  return session;
}

/**
 * Require the session user to be able to access a given admin module
 * at the given level. Defaults to "read" — pass "write" for any route
 * that creates, updates, or deletes data. See src/lib/rbac.ts for the
 * per-module read/write matrix.
 */
export async function requireModuleAccess(mod: ModuleName, level: AccessLevel = "read") {
  const session = await requireSession();
  const userRoles = session.user.roles ?? [];
  if (!anyRoleCanAccessModule(userRoles, mod, level)) throw new ForbiddenError();
  return session;
}

/** Helper for API route handlers to turn authorize errors into HTTP responses. */
export function authErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return new Response(JSON.stringify({ error: err.message }), { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return new Response(JSON.stringify({ error: err.message }), { status: 403 });
  }
  return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
}

/**
 * Parent Portal authorization. Never trust a studentId from a URL or
 * request body on its own — every parent-portal page/route re-checks
 * a Guardian row exists for (this user, this student), exactly as
 * every admin route re-checks module access. Throws ForbiddenError
 * (never a 404) so a parent probing another child's id learns nothing
 * about whether that id exists.
 */
export async function requireGuardianAccessToStudent(studentId: string) {
  const session = await requireSession();
  const link = await prisma.guardian.findUnique({
    where: { userId_studentId: { userId: session.user.id, studentId } },
  });
  if (!link) throw new ForbiddenError("You do not have access to this student's records");
  return session;
}

/** The student ids a signed-in guardian may view — used to render
 * "my children" lists without a per-child round trip. */
export async function guardianStudentIds(userId: string): Promise<string[]> {
  const links = await prisma.guardian.findMany({ where: { userId }, select: { studentId: true } });
  return links.map((l) => l.studentId);
}
