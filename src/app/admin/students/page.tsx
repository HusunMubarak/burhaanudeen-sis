import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { listStudents, needsTeacherScoping, getTeacherClassIds } from "@/lib/data/students";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Input, Select } from "@/components/ui/form";
import { STUDENT_STATUS_LABELS } from "@/lib/students";

export const metadata = { title: "Students" };

type SearchParams = Record<string, string | undefined>;

const STATUS_TONE: Record<string, "emerald" | "gold" | "muted"> = {
  ACTIVE: "emerald",
  ENROLLED: "emerald",
  ACCEPTED: "gold",
  APPLICANT: "gold",
  SUSPENDED: "muted",
  WITHDRAWN: "muted",
  TRANSFERRED: "muted",
  GRADUATED: "muted",
  EXPELLED: "muted",
};

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await requireModuleAccess("students", "read");
  const sp = await searchParams;

  // Item 6 (teacher scoping audit): this page called listStudents()
  // directly without the restrictToClassIds the API route
  // (/api/admin/students) already applies — a Teacher hitting this
  // page saw the whole-school roster instead of just their own
  // classes. Same pattern as GET /api/admin/students.
  const restrictToClassIds = needsTeacherScoping(session.user.roles ?? [])
    ? await getTeacherClassIds(session.user.id)
    : undefined;

  const page = sp.page ? Number(sp.page) : 1;
  const [result, classes] = await Promise.all([
    listStudents({
      q: sp.q,
      classId: sp.classId,
      status: sp.status,
      sort: (sp.sort as "name" | "admissionNumber" | "createdAt") ?? "name",
      dir: (sp.dir as "asc" | "desc") ?? "asc",
      page,
      restrictToClassIds,
    }),
    prisma.class.findMany({
      where: { isActive: true, ...(restrictToClassIds ? { id: { in: restrictToClassIds } } : {}) },
      orderBy: { level: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  function queryString(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
    }
    return `?${params.toString()}`;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Students</h1>
          <p className="mt-1 text-sm text-ink-soft">{result.total} student{result.total === 1 ? "" : "s"} on record.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/students/import" variant="outline" size="sm">
            Import
          </LinkButton>
          <LinkButton href="/api/admin/students/export?format=csv" variant="outline" size="sm">
            Export CSV
          </LinkButton>
          <LinkButton href="/api/admin/students/export?format=xlsx" variant="outline" size="sm">
            Export Excel
          </LinkButton>
          <LinkButton href="/api/admin/students/export?format=pdf" variant="outline" size="sm">
            Export PDF
          </LinkButton>
          <LinkButton href="/admin/students/new" size="sm">
            Add Student
          </LinkButton>
        </div>
      </div>

      <form className="mt-6 grid gap-3 sm:grid-cols-4" method="get">
        <Input name="q" placeholder="Search name, admission no. or guardian phone" defaultValue={sp.q ?? ""} />
        <Select name="classId" defaultValue={sp.classId ?? ""}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""}>
          <option value="">All statuses</option>
          {Object.entries(STUDENT_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-paper hover:bg-emerald-900">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/70">
        {result.students.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Try clearing filters, or add a student to get started."
            action={<LinkButton href="/admin/students/new">Add Student</LinkButton>}
          />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">
                  <Link href={queryString({ sort: "admissionNumber", dir: sp.sort === "admissionNumber" && sp.dir === "asc" ? "desc" : "asc", page: undefined })}>
                    Admission No.
                  </Link>
                </th>
                <th className="px-4 py-3">
                  <Link href={queryString({ sort: "name", dir: sp.sort !== "name" || sp.dir === "desc" ? "asc" : "desc", page: undefined })}>
                    Name
                  </Link>
                </th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Guardian Phone</th>
              </tr>
            </thead>
            <tbody>
              {result.students.map((s) => (
                <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper-dim">
                  <td className="px-4 py-3 font-mono-label text-xs text-ink-soft">{s.admissionNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/students/${s.id}`} className="font-medium text-emerald-800 hover:underline">
                      {s.lastName}, {s.firstName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{s.class?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[s.status] ?? "muted"}>{STUDENT_STATUS_LABELS[s.status]}</Badge>
                  </td>
                  <td className="px-4 py-3">{s.guardianPhone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {result.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={queryString({ page: String(p) })}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                p === result.page ? "bg-emerald-700 text-paper" : "border border-line text-ink-soft hover:bg-paper-dim"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
