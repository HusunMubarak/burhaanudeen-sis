import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { MODULES, anyRoleCanAccessModule, type ModuleName, type RoleName } from "@/lib/rbac";

/**
 * Uses the lightweight authConfig (no Prisma/bcrypt import) rather
 * than the full "@/lib/auth" export, keeping this file's dependency
 * graph small — Next.js 16 runs `proxy.ts` on the Node.js runtime,
 * but there's no reason to pull in the DB client just to read a JWT.
 */
const { auth } = NextAuth(authConfig);

/**
 * Route-level guard (formerly middleware.ts — renamed per Next.js 16's
 * middleware -> proxy convention). This is a UX convenience (redirect
 * unauthenticated or under-privileged users away from pages they can't
 * use) — it is NOT the security boundary. Every API route re-checks
 * with `requireRole` / `requireModuleAccess` from src/lib/authorize.ts,
 * because this proxy alone can be bypassed by calling the API directly.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/parent")) {
    const session = req.auth;
    if (!session?.user) {
      const loginUrl = new URL("/login", req.nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Resource-level scoping (which children this parent may see) is
    // enforced per-page/per-API against the Guardian table, the same
    // "proxy is UX only" split as /admin below.
    return NextResponse.next();
  }

  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /admin -> dashboard, /admin/settings -> settings module, etc.
  const segment = pathname.split("/")[2] as ModuleName | undefined;
  const mod: ModuleName = segment && (MODULES as readonly string[]).includes(segment) ? segment : "dashboard";

  const roles = (session.user.roles ?? []) as RoleName[];
  if (!anyRoleCanAccessModule(roles, mod)) {
    // A guardian-only account has no admin module access at all —
    // redirecting back to /admin would just fail the same check again
    // (infinite loop), so send it to the portal it actually has.
    if (roles.includes("PARENT") && !MODULES.some((m) => anyRoleCanAccessModule(roles, m))) {
      return NextResponse.redirect(new URL("/parent", req.nextUrl.origin));
    }
    return NextResponse.redirect(new URL("/admin?error=forbidden", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/parent/:path*"],
};
