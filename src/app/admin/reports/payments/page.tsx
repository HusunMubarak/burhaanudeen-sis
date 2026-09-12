import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata = { title: "Payment History" };

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PaymentHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireModuleAccess("reports", "read");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const pageSize = 30;

  const [total, payments] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNumber: true } }, reversal: true },
      orderBy: { recordedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Payment History</h1>
      <p className="mt-1 text-sm text-ink-soft">Every fee payment recorded across the school, most recent first.</p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-white/70">
        {payments.length === 0 ? (
          <EmptyState title="No payments recorded yet" description="Payments recorded from a student's fee ledger will appear here." />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper-dim">
                  <td className="px-4 py-3">{dateFmt.format(p.date)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/fees/students/${p.student.id}`} className="text-emerald-800 hover:underline">
                      {p.student.lastName}, {p.student.firstName}
                    </Link>
                    <span className="ml-1 font-mono-label text-xs text-ink-soft">{p.student.admissionNumber}</span>
                  </td>
                  <td className="px-4 py-3 font-medium">{ghs(Number(p.amount))}</td>
                  <td className="px-4 py-3">{p.method}</td>
                  <td className="px-4 py-3 text-ink-soft">{p.reference || "—"}</td>
                  <td className="px-4 py-3">
                    {p.status === "REVERSED" ? <Badge tone="muted">Reversed</Badge> : <Badge tone="emerald">Completed</Badge>}
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
