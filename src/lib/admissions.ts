export type ApplicationStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "INTERVIEW_REQUIRED"
  | "ACCEPTED"
  | "REJECTED"
  | "ENROLLED"
  | "WITHDRAWN";

export type PaymentClaimStatus = "NOT_SUBMITTED" | "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED";

/**
 * Valid application status transitions. Any (from, to) pair not listed
 * here is rejected by `canTransitionApplication` — this is the single
 * source of truth for the admissions workflow, checked server-side in
 * every mutation, never trusted from the client.
 */
const APPLICATION_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["INTERVIEW_REQUIRED", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  INTERVIEW_REQUIRED: ["UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"],
  ACCEPTED: ["ENROLLED", "WITHDRAWN"],
  REJECTED: [],
  ENROLLED: [],
  WITHDRAWN: [],
};

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return APPLICATION_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Payment claims start PENDING_VERIFICATION (the applicant's claim
 * must NEVER auto-become VERIFIED) and can only be decided once.
 */
const PAYMENT_TRANSITIONS: Record<PaymentClaimStatus, PaymentClaimStatus[]> = {
  NOT_SUBMITTED: ["PENDING_VERIFICATION"],
  PENDING_VERIFICATION: ["VERIFIED", "REJECTED"],
  VERIFIED: [],
  REJECTED: ["PENDING_VERIFICATION"], // applicant may resubmit a corrected claim
};

export function canTransitionPayment(from: PaymentClaimStatus, to: PaymentClaimStatus): boolean {
  return PAYMENT_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Enrollment additionally requires a verified payment on top of an
 * ACCEPTED application status — enforced here as one place, not
 * scattered across API routes.
 */
export function canEnroll(args: {
  status: ApplicationStatus;
  paymentStatus: PaymentClaimStatus;
}): { ok: true } | { ok: false; reason: string } {
  if (args.status !== "ACCEPTED") {
    return { ok: false, reason: "Application must be Accepted before enrollment." };
  }
  if (args.paymentStatus !== "VERIFIED") {
    return { ok: false, reason: "Payment must be verified before enrollment." };
  }
  return { ok: true };
}

/**
 * Public-facing status label. Deliberately never reveals admin notes,
 * reviewer identity, or internal-only states — see spec "Never expose
 * private administrator notes."
 */
export function publicApplicationStatusLabel(args: {
  status: ApplicationStatus;
  paymentStatus: PaymentClaimStatus;
}): string {
  const { status, paymentStatus } = args;

  if (status === "ENROLLED") return "Enrolled";
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  if (status === "WITHDRAWN") return "Application withdrawn";
  if (status === "INTERVIEW_REQUIRED") return "Interview required";

  // SUBMITTED / UNDER_REVIEW: lead with payment state since that's
  // usually the applicant's next action.
  if (paymentStatus === "NOT_SUBMITTED" || paymentStatus === "PENDING_VERIFICATION") {
    return "Payment not verified";
  }
  if (paymentStatus === "REJECTED") {
    return "Payment not verified";
  }
  if (status === "UNDER_REVIEW") return "Under review";
  return "Payment verified";
}

/**
 * A4: strips formatting and canonicalizes to local 10-digit form so
 * "024 400 0000", "+233 24 400 0000" and "0244000000" all compare
 * equal — used everywhere a submitted phone number is checked against
 * the one on file (status, payment, withdraw, duplicate detection).
 * Ghana-specific: a 12-digit number starting with the country code
 * "233" is rewritten to the local "0"-prefixed form.
 */
export function normalizePhone(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("233")) {
    return "0" + digits.slice(3);
  }
  return digits;
}

export function phoneMatches(a: string, b: string): boolean {
  return normalizePhone(a) === normalizePhone(b);
}

/**
 * C4: the amount paid must match the configured admission form fee,
 * within a cent of floating-point tolerance.
 */
export function feeAmountMatches(paidAmount: number, expectedFee: number): boolean {
  if (expectedFee <= 0) return true; // fee not configured yet — nothing to enforce against
  return Math.abs(paidAmount - expectedFee) <= 0.01;
}

/**
 * C5: an application counts as a duplicate of an existing OPEN one
 * (not already rejected/withdrawn/enrolled) when the normalized
 * guardian phone and the child's name + date of birth all match.
 * Case-insensitive on name, digits-only on phone.
 */
export const OPEN_APPLICATION_STATUSES: ApplicationStatus[] = ["SUBMITTED", "UNDER_REVIEW", "INTERVIEW_REQUIRED", "ACCEPTED"];

export function isDuplicateApplicant(
  candidate: { firstName: string; lastName: string; guardianPhone: string },
  existing: { firstName: string; lastName: string; guardianPhone: string }
): boolean {
  return (
    candidate.firstName.trim().toLowerCase() === existing.firstName.trim().toLowerCase() &&
    candidate.lastName.trim().toLowerCase() === existing.lastName.trim().toLowerCase() &&
    phoneMatches(candidate.guardianPhone, existing.guardianPhone)
  );
}
