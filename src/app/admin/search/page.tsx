import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { anyRoleCanAccessModule } from "@/lib/rbac";
import { needsTeacherScoping, getTeacherClassIds } from "@/lib/data/students";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requireModuleAccess("dashboard", "read");
  const roles = session.user.roles ?? [];
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // Item 6 (teacher scoping audit): the students section here was
  // gated only by module access (students:read, which a Teacher
  // holds) with no restriction to the teacher's own classes — same
  // leak class as the main /admin/students page. Same
  // restrictToClassIds pattern as GET /api/admin/students.
  const restrictToClassIds = needsTeacherScoping(roles)
    ? await getTeacherClassIds(session.user.id)
    : undefined;

  const [students, staff, applications] = query.length >= 2
    ? await Promise.all([
        anyRoleCanAccessModule(roles, "students")
          ? prisma.student.findMany({
              where: {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                  { admissionNumber: { contains: query, mode: "insensitive" } },
                ],
                ...(restrictToClassIds ? { classId: { in: restrictToClassIds } } : {}),
              },
              take: 15,
            })
          : [],
        anyRoleCanAccessModule(roles, "staff")
          ? prisma.staff.findMany({
              where: {
                OR: [
                  { user: { name: { contains: query, mode: "insensitive" } } },
                  { staffNumber: { contains: query, mode: "insensitive" } },
                ],
              },
              include: { user: { select: { name: true } } },
              take: 15,
            })
          : [],
        anyRoleCanAccessModule(roles, "admissions")
          ? prisma.application.findMany({
              where: {
                OR: [
                  { firstName: { contains: query, mode: "insensitive" } },
                  { lastName: { contains: query, mode: "insensitive" } },
                  { applicationNumber: { contains: query, mode: "insensitive" } },
                ],
              },
              take: 15,
            })
          : [],
      ])
    : [[], [], []];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Search</h1>
      <form className="mt-4 max-w-md">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search students, staff, applications…"
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm"
        />
      </form>

      {query.length >= 2 && (
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Students ({students.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-sm text-ink-soft">No matches.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {students.map((s) => (
                    <li key={s.id}>
                      <Link href={`/admin/students/${s.id}`} className="text-emerald-700 hover:underline">
                        {s.firstName} {s.lastName}
                      </Link>{" "}
                      <span className="text-ink-soft">({s.admissionNumber})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Staff ({staff.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {staff.length === 0 ? (
                <p className="text-sm text-ink-soft">No matches.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {staff.map((s) => (
                    <li key={s.id}>
                      <Link href={`/admin/staff/${s.id}/edit`} className="text-emerald-700 hover:underline">
                        {s.user.name}
                      </Link>{" "}
                      <span className="text-ink-soft">({s.staffNumber})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Applications ({applications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <p className="text-sm text-ink-soft">No matches.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {applications.map((a) => (
                    <li key={a.id}>
                      <Link href={`/admin/admissions/${a.id}`} className="text-emerald-700 hover:underline">
                        {a.firstName} {a.lastName}
                      </Link>{" "}
                      <span className="text-ink-soft">({a.applicationNumber})</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
