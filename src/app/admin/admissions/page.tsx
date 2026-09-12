import Link from "next/link";
import { requireModuleAccess } from "@/lib/authorize";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { publicApplicationStatusLabel, type ApplicationStatus, type PaymentClaimStatus } from "@/lib/admissions";

export const metadata = { title: "Admissions" };

type FilterKey =
  | "all"
  | "payment_pending"
  | "payment_verified"
  | "under_review"
  | "interview"
  | "accepted"
  | "rejected"
  | "enrolled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "payment_pending", label: "Payment Pending" },
  { key: "payment_verified", label: "Payment Verified" },
  { key: "under_review", label: "Under Review" },
  { key: "interview", label: "Interview" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "enrolled", label: "Enrolled" },
];

function whereForFilter(filter: FilterKey) {
  switch (filter) {
    case "payment_pending":
      return { paymentClaim: { status: { in: ["PENDING_VERIFICATION" as const] } } };
    case "payment_verified":
      return { paymentClaim: { status: "VERIFIED" as const } };
    case "under_review":
      return { status: "UNDER_REVIEW" as const };
    case "interview":
      return { status: "INTERVIEW_REQUIRED" as const };
    case "accepted":
      return { status: "ACCEPTED" as const };
    case "rejected":
      return { status: "REJECTED" as const };
    case "enrolled":
      return { status: "ENROLLED" as const };
    default:
      return {};
  }
}

function statusTone(status: ApplicationStatus): "emerald" | "gold" | "muted" {
  if (status === "ACCEPTED" || status === "ENROLLED") return "emerald";
  if (status === "REJECTED" || status === "WITHDRAWN") return "muted";
  return "gold";
}

export default async function AdmissionsListPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireModuleAccess("admissions", "read");
  const { filter: rawFilter } = await searchParams;
  const filter: FilterKey = (FILTERS.some((f) => f.key === rawFilter) ? rawFilter : "all") as FilterKey;

  const applications = await prisma.application.findMany({
    where: whereForFilter(filter),
    include: { paymentClaim: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-ink">Admissions</h1>
      <p className="mt-1 text-sm text-ink-soft">Review applications, verify payments, and enroll accepted students.</p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/admin/admissions" : `/admin/admissions?filter=${f.key}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f.key
                ? "border-emerald-700 bg-emerald-700 text-white"
                : "border-line bg-white text-ink-soft hover:bg-paper-dim"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="mt-6">
        {applications.length === 0 ? (
          <EmptyState title="No applications" description="No applications match this filter yet." />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-paper-dim text-xs uppercase text-ink-soft">
                  <tr>
                    <th className="px-4 py-3">Application #</th>
                    <th className="px-4 py-3">Applicant</th>
                    <th className="px-4 py-3">Level</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((a) => {
                    const paymentStatus: PaymentClaimStatus = (a.paymentClaim?.status as PaymentClaimStatus) ?? "NOT_SUBMITTED";
                    return (
                      <tr key={a.id} className="border-b border-line last:border-0 hover:bg-paper-dim/60">
                        <td className="px-4 py-3">
                          <Link href={`/admin/admissions/${a.id}`} className="font-mono-label text-emerald-700">
                            {a.applicationNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-ink">
                          {a.firstName} {a.lastName}
                        </td>
                        <td className="px-4 py-3 text-ink-soft">{a.levelAppliedFor}</td>
                        <td className="px-4 py-3">
                          <Badge tone={paymentStatus === "VERIFIED" ? "emerald" : "muted"}>
                            {paymentStatus.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={statusTone(a.status as ApplicationStatus)}>
                            {publicApplicationStatusLabel({ status: a.status as ApplicationStatus, paymentStatus })}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-ink-soft">
                          {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(a.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
