import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { checkRateLimit, getClientIp } from "@/lib/public-guard";
import type { RoleName } from "@/lib/rbac";

// Full NextAuth config, including the Credentials provider (needs
// Prisma + bcrypt, so this file is Node-runtime only — never imported
// from proxy.ts, which uses auth.config.ts directly instead).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        // A5: 10 attempts / 15 min / IP — fails closed (rate-limited
        // looks identical to a wrong password, so it doesn't leak
        // that a lockout is in effect).
        const ip = getClientIp(request);
        const { allowed } = await checkRateLimit(ip, "auth:login", 10);
        if (!allowed) return null;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: { roles: { include: { role: true } }, staffProfile: { select: { status: true } } },
        });

        if (!user || !user.isActive) return null;
        // A2: a resigned/terminated/retired/inactive staff member is
        // locked out even if their User row is still marked active.
        if (user.staffProfile && user.staffProfile.status !== "ACTIVE") return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles.map((ur) => ur.role.name) as RoleName[],
        };
      },
    }),
  ],
});
