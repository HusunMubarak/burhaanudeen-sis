import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { listStudentsOwing } from "@/lib/data/finance";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Input, Select } from "@/components/ui/form";

export const metadata = { title: "Students Owing" };

type SearchParams = Record<string, string | undefined>;

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function StudentsOwingPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireModuleAccess("fees", "read");
  const sp = await searchParams;
  const page = sp.page ? Number(sp.page) : 1;

  const [result, classes, years] = await Promise.all([
    listStudentsOwing({
      q: sp.q,
      classId: sp.classId,
      academicYearId: sp.academicYearId,
      minBalance: sp.minBalance ? Number(sp.minBalance) : undefined,
      maxBalance: sp.maxBalance ? Number(sp.maxBalance) : undefined,
      sort: (sp.sort as "balance-desc" | "balance-asc" | "name" | "class") ?? "balance-desc",
      page,
    }),
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  function queryString(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    const merged = { ...sp, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    return `?${params.toString()}`;
  }

  const exportParams = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "page") exportParams.set(k, v);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Students Owing</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {result.total} student{result.total === 1 ? "" : "s"} owing — {ghs(result.totalOwing)} outstanding.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/api/admin/finance/owing?${exportParams.toString()}&format=csv`} variant="outline" size="sm">
            Export CSV
          </LinkButton>
          <LinkButton href={`/api/admin/finance/owing?${exportParams.toString()}&format=xlsx`} variant="outline" size="sm">
            Export Excel
          </LinkButton>
          <LinkButton href={`/api/admin/finance/owing?${exportParams.toString()}&format=pdf`} variant="outline" size="sm">
            Export PDF
          </LinkButton>
        </div>
      </div>

      <form className="mt-6 grid gap-3 sm:grid-cols-6" method="get">
        <Input name="q" placeholder="Search name or admission no." defaultValue={sp.q ?? ""} className="sm:col-span-2" />
        <Select name="classId" defaultValue={sp.classId ?? ""}>
          <option value="">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select name="academicYearId" defaultValue={sp.academicYearId ?? ""}>
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y.id} value={y.id}>{y.name}</option>
          ))}
        </Select>
        <Input name="minBalance" type="number" placeholder="Min balance" defaultValue={sp.minBalance ?? ""} />
        <Input name="maxBalance" type="number" placeholder="Max balance" defaultValue={sp.maxBalance ?? ""} />
        <button type="submit" className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-paper hover:bg-emerald-900 sm:col-span-6 sm:w-fit">
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/70">
        {result.rows.length === 0 ? (
          <EmptyState title="No students owing" description="Either fees haven't been assigned yet, or everyone is paid up." />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Admission No.</th>
                <th className="px-4 py-3">
                  <Link href={queryString({ sort: "name", page: undefined })}>Name</Link>
                </th>
                <th className="px-4 py-3">
                  <Link href={queryString({ sort: "class", page: undefined })}>Class</Link>
                </th>
                <th className="px-4 py-3">Expected</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">
                  <Link href={queryString({ sort: sp.sort === "balance-desc" ? "balance-asc" : "balance-desc", page: undefined })}>
                    Balance
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper-dim">
                  <td className="px-4 py-3 font-mono-label text-xs text-ink-soft">{r.admissionNumber}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/fees/students/${r.id}`} className="font-medium text-emerald-800 hover:underline">
                      {r.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{r.className}</td>
                  <td className="px-4 py-3">{ghs(r.expected)}</td>
                  <td className="px-4 py-3">{ghs(r.paid)}</td>
                  <td className="px-4 py-3 font-semibold text-red-700">{ghs(r.balance)}</td>
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
