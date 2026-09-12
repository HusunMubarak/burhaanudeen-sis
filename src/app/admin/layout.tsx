import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import type { RoleName } from "@/lib/rbac";

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware already redirects unauthenticated users
  // away from /admin/*, but every server entry point re-checks the
  // session directly rather than trusting the request got here safely.
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/admin");

  const roles = (session.user.roles ?? []) as RoleName[];

  return (
    <AdminShell roles={roles} name={session.user.name ?? session.user.email ?? "Staff"}>
      {children}
    </AdminShell>
  );
}
