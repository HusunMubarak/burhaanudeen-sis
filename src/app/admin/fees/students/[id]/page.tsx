import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { buildStudentFeeLedger } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { RecordPaymentForm, ReversePaymentButton } from "@/components/admin/payment-forms";

export const metadata = { title: "Student Fee Ledger" };

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function StudentLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("fees", "read");
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { name: true } },
      feeAssignments: {
        orderBy: { createdAt: "desc" },
        include: { academicYear: { select: { name: true } }, term: { select: { name: true } } },
      },
      payments: { orderBy: { date: "desc" }, include: { reversal: true } },
    },
  });

  if (!student) notFound();

  const ledger = buildStudentFeeLedger(
    student.feeAssignments.map((a) => ({ amount: Number(a.amount) })),
    student.payments.map((p) => ({ amount: Number(p.amount), status: p.status }))
  );

  const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

  return (
    <div>
      <p className="font-mono-label text-xs uppercase text-gold-600">{student.admissionNumber}</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
        {student.firstName} {student.lastName}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">{student.class?.name ?? "Unassigned class"}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Expected</p>
            <p className="mt-1 text-xl font-semibold text-ink">{ghs(ledger.expected)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Paid</p>
            <p className="mt-1 text-xl font-semibold text-emerald-700">{ghs(ledger.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-5">
            <p className="text-xs uppercase text-ink-soft">Balance</p>
            <p className={`mt-1 text-xl font-semibold ${ledger.balance > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {ghs(ledger.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RecordPaymentForm studentId={student.id} />

        <Card>
          <CardHeader>
            <CardTitle>Fee Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {student.feeAssignments.length === 0 ? (
              <p className="text-sm text-ink-soft">No fees assigned yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {student.feeAssignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                    <div>
                      <p className="font-medium text-ink">{a.categoryName}</p>
                      <p className="text-xs text-ink-soft">
                        {a.academicYear.name}
                        {a.term ? ` · ${a.term.name}` : ""}
                      </p>
                    </div>
                    <span className="font-medium text-ink">{ghs(Number(a.amount))}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {student.payments.length === 0 ? (
            <p className="text-sm text-ink-soft">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                    <th className="py-2">Date</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Reference</th>
                    <th className="py-2">Status</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {student.payments.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="py-2">{dateFmt.format(p.date)}</td>
                      <td className="py-2 font-medium">{ghs(Number(p.amount))}</td>
                      <td className="py-2">{p.method}</td>
                      <td className="py-2 text-ink-soft">{p.reference || "—"}</td>
                      <td className="py-2">
                        {p.status === "REVERSED" ? (
                          <Badge tone="muted">Reversed</Badge>
                        ) : (
                          <Badge tone="emerald">Completed</Badge>
                        )}
                        {p.reversal && <p className="mt-1 text-xs text-ink-soft">{p.reversal.reason}</p>}
                      </td>
                      <td className="py-2">{p.status === "COMPLETED" && <ReversePaymentButton paymentId={p.id} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
