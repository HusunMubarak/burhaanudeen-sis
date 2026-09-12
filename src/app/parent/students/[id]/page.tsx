import { notFound } from "next/navigation";
import { requireGuardianAccessToStudent } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { buildStudentFeeLedger } from "@/lib/finance";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { STUDENT_STATUS_LABELS } from "@/lib/students";

export const metadata = { title: "Child Profile" };

const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

export default async function ParentStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Every field pulled below belongs to exactly one child, and this
  // check is what makes that safe — see requireGuardianAccessToStudent.
  await requireGuardianAccessToStudent(id);

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { name: true } },
      academicYear: { select: { name: true } },
      feeAssignments: { select: { amount: true } },
      payments: { select: { amount: true, status: true, date: true, method: true, reference: true }, orderBy: { date: "desc" } },
      attendances: { orderBy: { date: "desc" }, take: 30 },
      results: {
        orderBy: { enteredAt: "desc" },
        take: 20,
        include: {
          assessment: {
            select: {
              name: true,
              maxScore: true,
              term: { select: { name: true } },
              classSubject: { select: { subject: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!student) notFound();

  const ledger = buildStudentFeeLedger(
    student.feeAssignments.map((a) => ({ amount: Number(a.amount) })),
    student.payments.map((p) => ({ amount: Number(p.amount), status: p.status }))
  );

  const attendanceCounts = student.attendances.reduce(
    (acc, a) => ({ ...acc, [a.status]: (acc[a.status] ?? 0) + 1 }),
    {} as Record<string, number>
  );

  const ghs = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" });

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono-label text-xs uppercase text-gold-600">{student.admissionNumber}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
          {student.firstName} {student.lastName}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
          <Badge tone="emerald">{STUDENT_STATUS_LABELS[student.status]}</Badge>
          <span>{student.class?.name ?? "Unassigned class"}</span>
          <span>·</span>
          <span>{student.academicYear?.name ?? "—"}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance (last 30 records)</CardTitle>
          </CardHeader>
          <CardContent>
            {student.attendances.length === 0 ? (
              <p className="text-sm text-ink-soft">No attendance recorded yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((s) => (
                  <div key={s} className="rounded-lg border border-line p-3 text-center">
                    <p className="text-lg font-semibold text-ink">{attendanceCounts[s] ?? 0}</p>
                    <p className="text-xs uppercase text-ink-soft">{s}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fees</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase text-ink-soft">Expected</p>
              <p className="mt-0.5 font-semibold text-ink">{ghs.format(ledger.expected)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-soft">Paid</p>
              <p className="mt-0.5 font-semibold text-emerald-700">{ghs.format(ledger.paid)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-ink-soft">Outstanding</p>
              <p className={`mt-0.5 font-semibold ${ledger.balance > 0 ? "text-red-700" : "text-ink"}`}>
                {ghs.format(ledger.balance)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
          {student.results.length === 0 ? (
            <p className="text-sm text-ink-soft">No results recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Assessment</th>
                    <th className="py-2 pr-4">Term</th>
                    <th className="py-2 pr-4">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {student.results.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="py-2 pr-4 font-medium text-ink">{r.assessment.classSubject.subject.name}</td>
                      <td className="py-2 pr-4 text-ink-soft">{r.assessment.name}</td>
                      <td className="py-2 pr-4 text-ink-soft">{r.assessment.term.name}</td>
                      <td className="py-2 pr-4 text-ink-soft">
                        {Number(r.score)} / {Number(r.assessment.maxScore)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {student.payments.length === 0 ? (
            <p className="text-sm text-ink-soft">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {student.payments.slice(0, 10).map((p, i) => (
                <li key={i} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
                  <div>
                    <p className="font-medium text-ink">{ghs.format(Number(p.amount))}</p>
                    <p className="text-xs text-ink-soft">
                      {dateFmt.format(p.date)} · {p.method}
                      {p.reference ? ` · ${p.reference}` : ""}
                    </p>
                  </div>
                  <Badge tone={p.status === "COMPLETED" ? "emerald" : "gold"}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
