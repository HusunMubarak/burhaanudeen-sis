import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Audit Logs" };

const PAGE_SIZE = 50;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // B6: Proprietor + Super Admin only (audit-logs module has no
  // write level — it's a viewer, not something anyone edits).
  await requireModuleAccess("audit-logs", "read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Audit Logs</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {total} recorded action{total === 1 ? "" : "s"} — payment verification, admission decisions, enrollment,
        student/staff changes, exports, and sign-ins.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/70">
        {logs.length === 0 ? (
          <EmptyState title="No audit log entries yet" description="Actions across the system will appear here as they happen." />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-line last:border-0 hover:bg-paper-dim">
                  <td className="px-4 py-3 whitespace-nowrap font-mono-label text-xs text-ink-soft">
                    {dateFmt.format(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">{log.user?.name ?? "System / public"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {log.entity}
                    {log.entityId && <span className="ml-1 font-mono-label text-xs">#{log.entityId.slice(0, 8)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pageCount > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`?page=${p}`}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                p === page ? "bg-emerald-700 text-paper" : "border border-line text-ink-soft hover:bg-paper-dim"
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
