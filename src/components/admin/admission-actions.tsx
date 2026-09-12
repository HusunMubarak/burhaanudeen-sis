"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label, Textarea, Select } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { canTransitionApplication, type ApplicationStatus, type PaymentClaimStatus } from "@/lib/admissions";

type ClassOption = { id: string; name: string };
type YearOption = { id: string; name: string };

export function AdmissionActions({
  applicationId,
  applicationNumber,
  status,
  paymentStatus,
  hasPaymentClaim,
  isEnrolled,
  classes,
  academicYears,
}: {
  applicationId: string;
  applicationNumber: string;
  status: ApplicationStatus;
  paymentStatus: PaymentClaimStatus;
  hasPaymentClaim: boolean;
  isEnrolled: boolean;
  classes: ClassOption[];
  academicYears: YearOption[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id ?? "");

  async function callApi(url: string, body: unknown, method: "PATCH" | "POST" = "PATCH") {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Action failed.");
        return false;
      }
      toast.success("Done.");
      router.refresh();
      return true;
    } catch {
      toast.error("Network error.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // C1: single source of truth for which review actions are even
  // possible from the current status — the server enforces the same
  // rule (src/lib/admissions.ts) and would 409 on anything not shown
  // here, but showing a button that can only fail is bad UX and
  // invites confusion about what the workflow actually allows.
  const canReview = (target: ApplicationStatus) => canTransitionApplication(status, target);
  const showReviewCard = canReview("UNDER_REVIEW") || canReview("INTERVIEW_REQUIRED") || canReview("ACCEPTED") || canReview("REJECTED");
  const canWithdraw = canTransitionApplication(status, "WITHDRAWN");

  return (
    <div className="space-y-6">
      {hasPaymentClaim && paymentStatus === "PENDING_VERIFICATION" && (
        <Card>
          <CardHeader>
            <CardTitle>Verify Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="payment-note">Note (optional)</Label>
              <Textarea id="payment-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
            </div>
            <div className="flex gap-2">
              <Button
                disabled={busy}
                onClick={() => callApi(`/api/admin/applications/${applicationId}/payment`, { action: "VERIFY", note })}
              >
                Verify Payment
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => callApi(`/api/admin/applications/${applicationId}/payment`, { action: "REJECT", note })}
              >
                Reject Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showReviewCard && (
        <Card>
          <CardHeader>
            <CardTitle>Review Application</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="decision-reason">Decision reason / notes (optional)</Label>
              <Textarea
                id="decision-reason"
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {canReview("UNDER_REVIEW") && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    callApi(`/api/admin/applications/${applicationId}/review`, { status: "UNDER_REVIEW", decisionReason })
                  }
                >
                  Move to Under Review
                </Button>
              )}
              {canReview("INTERVIEW_REQUIRED") && (
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() =>
                    callApi(`/api/admin/applications/${applicationId}/review`, {
                      status: "INTERVIEW_REQUIRED",
                      decisionReason,
                    })
                  }
                >
                  Request Interview
                </Button>
              )}
              {canReview("ACCEPTED") && (
                <Button
                  disabled={busy || paymentStatus !== "VERIFIED"}
                  title={paymentStatus !== "VERIFIED" ? "Verify payment before accepting" : undefined}
                  onClick={() =>
                    callApi(`/api/admin/applications/${applicationId}/review`, { status: "ACCEPTED", decisionReason })
                  }
                >
                  Accept
                </Button>
              )}
              {canReview("REJECTED") && (
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() =>
                    callApi(`/api/admin/applications/${applicationId}/review`, { status: "REJECTED", decisionReason })
                  }
                >
                  Reject
                </Button>
              )}
            </div>
            {canReview("ACCEPTED") && paymentStatus !== "VERIFIED" && (
              <p className="text-xs text-gold-600">Verify the payment claim above before this application can be accepted.</p>
            )}
          </CardContent>
        </Card>
      )}

      {status === "ACCEPTED" && !isEnrolled && (
        <Card>
          <CardHeader>
            <CardTitle>Enroll Student</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentStatus !== "VERIFIED" && (
              <p className="rounded-md bg-gold-100 px-3 py-2 text-sm text-gold-600">
                Payment must be verified before enrollment.
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="enroll-class">Class</Label>
                <Select id="enroll-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="enroll-year">Academic Year</Label>
                <Select id="enroll-year" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button
              disabled={busy || paymentStatus !== "VERIFIED" || !classId || !academicYearId}
              onClick={async () => {
                const ok = await callApi(
                  `/api/admin/applications/${applicationId}/enroll`,
                  { classId, academicYearId },
                  "POST"
                );
                if (ok) router.push("/admin/students");
              }}
            >
              Enroll Student
            </Button>
          </CardContent>
        </Card>
      )}

      {(status === "ACCEPTED" || status === "ENROLLED") && (
        <Card>
          <CardHeader>
            <CardTitle>Admission Letter</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button variant="outline" onClick={() => window.open(`/api/admin/applications/${applicationId}/letter`, "_blank")}>
              View / Print
            </Button>
            <a
              href={`/api/admin/applications/${applicationId}/letter`}
              download={`${applicationNumber}-admission-letter.pdf`}
              className="inline-flex h-10 items-center justify-center rounded-md border border-line px-4 text-sm font-medium text-ink hover:bg-paper-dim"
            >
              Download
            </a>
          </CardContent>
        </Card>
      )}

      {canWithdraw && (
        <Card>
          <CardHeader>
            <CardTitle>Withdraw</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-ink-soft">Withdraw this application on the applicant&apos;s behalf. This cannot be undone.</p>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() => {
                if (!confirm("Withdraw this application? This cannot be undone.")) return;
                callApi(`/api/admin/applications/${applicationId}/review`, { status: "WITHDRAWN", decisionReason });
              }}
            >
              Withdraw Application
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
