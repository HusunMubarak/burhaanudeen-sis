import type { NextAuthConfig } from "next-auth";
import type { RoleName } from "@/lib/rbac";

/**
 * Edge-compatible half of the NextAuth config. Middleware runs on the
 * Edge runtime, which cannot load Prisma or bcrypt — so this file must
 * never import them. The Credentials provider (which needs both) is
 * added separately in src/lib/auth.ts, which is only used from Node
 * runtime code (API routes, server components).
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.roles = (user as { roles?: RoleName[] }).roles ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roles = (token.roles as RoleName[]) ?? [];
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
