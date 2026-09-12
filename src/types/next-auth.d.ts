import type { RoleName } from "@/lib/rbac";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: RoleName[];
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    roles?: RoleName[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roles: RoleName[];
  }
}
