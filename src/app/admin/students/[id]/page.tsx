import { notFound } from "next/navigation";
import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { StudentStatusChanger } from "@/components/admin/student-status-changer";
import { AddDocumentForm } from "@/components/admin/add-document-form";
import { GuardianAccessManager } from "@/components/admin/guardian-access-manager";
import { STUDENT_STATUS_LABELS } from "@/lib/students";

export const metadata = { title: "Student Profile" };

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("students", "read");
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      class: { select: { id: true, name: true, section: true } },
      academicYear: { select: { id: true, name: true } },
      documents: { orderBy: { createdAt: "desc" } },
      statusHistory: { orderBy: { createdAt: "desc" } },
      application: { select: { id: true, applicationNumber: true, status: true, createdAt: true } },
      guardians: { include: { user: { select: { name: true, email: true, isActive: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!student) notFound();

  const dateFmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono-label text-xs uppercase text-gold-600">{student.admissionNumber}</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            {student.firstName} {student.otherNames} {student.lastName}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-soft">
            <Badge tone="emerald">{STUDENT_STATUS_LABELS[student.status]}</Badge>
            <span>{student.class?.name ?? "Unassigned class"}</span>
            <span>·</span>
            <span>{student.academicYear?.name ?? "No academic year set"}</span>
          </div>
        </div>
        <LinkButton href={`/admin/students/${student.id}/edit`} variant="outline" size="sm">
          Edit Details
        </LinkButton>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Gender" value={student.gender} />
              <Field label="Date of Birth" value={dateFmt.format(student.dateOfBirth)} />
              <Field label="Nationality" value={student.nationality} />
              <Field label="Previous School" value={student.previousSchool || "—"} />
              <Field label="Address" value={student.address || "—"} className="sm:col-span-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardian</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Guardian Name" value={student.guardianName} />
              <Field label="Guardian Phone" value={student.guardianPhone} />
              <Field label="Guardian Email" value={student.guardianEmail || "—"} />
              <Field label="Emergency Contact" value={student.emergencyContactName || "—"} />
              <Field label="Emergency Phone" value={student.emergencyContactPhone || "—"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment & Admission History</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <Field label="Admission Date" value={dateFmt.format(student.admissionDate)} />
              <Field label="Class" value={student.class?.name ?? "Unassigned"} />
              <Field label="Academic Year" value={student.academicYear?.name ?? "Unassigned"} />
              <Field
                label="Originating Application"
                value={
                  student.application ? (
                    <Link href={`/admin/admissions/${student.application.id}`} className="text-emerald-700 hover:underline">
                      {student.application.applicationNumber}
                    </Link>
                  ) : (
                    "Direct entry (no application)"
                  )
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Academic History, Attendance, Results & Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-ink-soft">
                These sections connect to the Academics, Attendance, Results and Fees modules, which are built out
                in later phases. This student record is already keyed and ready for them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {student.documents.length === 0 ? (
                <p className="text-sm text-ink-soft">No documents on file.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {student.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between">
                      <span>{d.name}</span>
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                          View
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <AddDocumentForm endpoint={`/api/admin/students/${student.id}/documents`} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Change Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StudentStatusChanger studentId={student.id} currentStatus={student.status} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parent Portal Access</CardTitle>
            </CardHeader>
            <CardContent>
              <GuardianAccessManager studentId={student.id} initial={student.guardians} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              {student.statusHistory.length === 0 ? (
                <p className="text-sm text-ink-soft">No history yet.</p>
              ) : (
                <ul className="space-y-3 text-sm">
                  {student.statusHistory.map((h) => (
                    <li key={h.id} className="border-b border-line pb-3 last:border-0 last:pb-0">
                      <p className="font-medium text-ink">
                        {h.fromStatus ? `${STUDENT_STATUS_LABELS[h.fromStatus]} → ` : ""}
                        {STUDENT_STATUS_LABELS[h.toStatus]}
                      </p>
                      <p className="text-xs text-ink-soft">{dateFmt.format(h.createdAt)}</p>
                      {h.note && <p className="mt-1 text-ink-soft">{h.note}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs uppercase text-ink-soft">{label}</p>
      <p className="mt-0.5 text-ink">{value}</p>
    </div>
  );
}
