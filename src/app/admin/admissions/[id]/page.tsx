import { notFound } from "next/navigation";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/card";
import { AdmissionActions } from "@/components/admin/admission-actions";
import { AddDocumentForm } from "@/components/admin/add-document-form";
import type { ApplicationStatus, PaymentClaimStatus } from "@/lib/admissions";

export const metadata = { title: "Application Detail" };

export default async function AdmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleAccess("admissions", "read");
  const { id } = await params;

  const [application, classes, academicYears] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      include: { paymentClaim: true, student: true, academicYear: true, documents: { orderBy: { createdAt: "desc" } } },
    }),
    prisma.class.findMany({ where: { isActive: true }, orderBy: { level: "asc" }, select: { id: true, name: true } }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true } }),
  ]);

  if (!application) notFound();

  const paymentStatus: PaymentClaimStatus = (application.paymentClaim?.status as PaymentClaimStatus) ?? "NOT_SUBMITTED";

  const infoRows: [string, string][] = [
    ["Full name", `${application.firstName} ${application.lastName} ${application.otherNames}`.trim()],
    ["Gender", application.gender],
    ["Date of birth", new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(application.dateOfBirth)],
    ["Nationality", application.nationality],
    ["Address", application.address || "—"],
    ["Level applying for", application.levelAppliedFor],
    ["Previous school", application.previousSchool || "—"],
  ];

  const guardianRows: [string, string][] = [
    ["Guardian name", application.guardianName],
    ["Guardian phone", application.guardianPhone],
    ["Guardian email", application.guardianEmail || "—"],
    ["Emergency contact", application.emergencyContactName || "—"],
    ["Emergency phone", application.emergencyContactPhone || "—"],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {application.firstName} {application.lastName}
          </h1>
          <p className="mt-1 font-mono-label text-sm text-ink-soft">{application.applicationNumber}</p>
        </div>
        <Badge tone="gold">{(application.status as ApplicationStatus).replace("_", " ")}</Badge>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Applicant Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {infoRows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase text-ink-soft">{label}</dt>
                    <dd className="text-sm text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Guardian Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 sm:grid-cols-2">
                {guardianRows.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase text-ink-soft">{label}</dt>
                    <dd className="text-sm text-ink">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {application.paymentClaim && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Claim</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase text-ink-soft">Payer</dt>
                    <dd className="text-sm text-ink">{application.paymentClaim.payerName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-ink-soft">Phone</dt>
                    <dd className="text-sm text-ink">{application.paymentClaim.payerPhone}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-ink-soft">Amount</dt>
                    <dd className="text-sm text-ink">GHS {Number(application.paymentClaim.amount).toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-ink-soft">Reference</dt>
                    <dd className="text-sm text-ink">{application.paymentClaim.reference}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-ink-soft">Date Paid</dt>
                    <dd className="text-sm text-ink">
                      {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(application.paymentClaim.paidAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase text-ink-soft">Status</dt>
                    <dd className="text-sm text-ink">{paymentStatus.replace("_", " ")}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {application.adminNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm text-ink-soft">{application.adminNotes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {application.documents.length === 0 ? (
                <p className="text-sm text-ink-soft">No documents recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {application.documents.map((d) => (
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
              <AddDocumentForm endpoint={`/api/admin/applications/${application.id}/documents`} />
            </CardContent>
          </Card>
        </div>

        <div>
          <AdmissionActions
            applicationId={application.id}
            applicationNumber={application.applicationNumber}
            status={application.status as ApplicationStatus}
            paymentStatus={paymentStatus}
            hasPaymentClaim={!!application.paymentClaim}
            isEnrolled={!!application.student}
            classes={classes}
            academicYears={academicYears}
          />
        </div>
      </div>
    </div>
  );
}
