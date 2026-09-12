import { describe, it, expect } from "vitest";
import {
  canTransitionApplication,
  canTransitionPayment,
  canEnroll,
  publicApplicationStatusLabel,
} from "@/lib/admissions";

describe("admissions: canTransitionApplication", () => {
  it("allows SUBMITTED -> UNDER_REVIEW", () => {
    expect(canTransitionApplication("SUBMITTED", "UNDER_REVIEW")).toBe(true);
  });

  it("allows UNDER_REVIEW -> ACCEPTED, REJECTED, INTERVIEW_REQUIRED", () => {
    expect(canTransitionApplication("UNDER_REVIEW", "ACCEPTED")).toBe(true);
    expect(canTransitionApplication("UNDER_REVIEW", "REJECTED")).toBe(true);
    expect(canTransitionApplication("UNDER_REVIEW", "INTERVIEW_REQUIRED")).toBe(true);
  });

  it("allows ACCEPTED -> ENROLLED", () => {
    expect(canTransitionApplication("ACCEPTED", "ENROLLED")).toBe(true);
  });

  it("rejects skipping straight from SUBMITTED to ACCEPTED", () => {
    expect(canTransitionApplication("SUBMITTED", "ACCEPTED")).toBe(false);
  });

  it("rejects skipping straight from SUBMITTED to ENROLLED", () => {
    expect(canTransitionApplication("SUBMITTED", "ENROLLED")).toBe(false);
  });

  it("treats REJECTED, ENROLLED and WITHDRAWN as terminal", () => {
    expect(canTransitionApplication("REJECTED", "UNDER_REVIEW")).toBe(false);
    expect(canTransitionApplication("ENROLLED", "ACCEPTED")).toBe(false);
    expect(canTransitionApplication("WITHDRAWN", "SUBMITTED")).toBe(false);
  });

  it("allows moving an application back from interview to review", () => {
    expect(canTransitionApplication("INTERVIEW_REQUIRED", "UNDER_REVIEW")).toBe(true);
  });
});

describe("admissions: canTransitionPayment", () => {
  it("never allows a claim to auto-verify from NOT_SUBMITTED", () => {
    expect(canTransitionPayment("NOT_SUBMITTED", "VERIFIED")).toBe(false);
  });

  it("requires PENDING_VERIFICATION before VERIFIED or REJECTED", () => {
    expect(canTransitionPayment("PENDING_VERIFICATION", "VERIFIED")).toBe(true);
    expect(canTransitionPayment("PENDING_VERIFICATION", "REJECTED")).toBe(true);
  });

  it("treats VERIFIED as terminal", () => {
    expect(canTransitionPayment("VERIFIED", "PENDING_VERIFICATION")).toBe(false);
    expect(canTransitionPayment("VERIFIED", "REJECTED")).toBe(false);
  });

  it("allows resubmission after a rejected claim", () => {
    expect(canTransitionPayment("REJECTED", "PENDING_VERIFICATION")).toBe(true);
  });
});

describe("admissions: canEnroll", () => {
  it("requires ACCEPTED status", () => {
    const result = canEnroll({ status: "UNDER_REVIEW", paymentStatus: "VERIFIED" });
    expect(result.ok).toBe(false);
  });

  it("requires VERIFIED payment even if accepted", () => {
    const result = canEnroll({ status: "ACCEPTED", paymentStatus: "PENDING_VERIFICATION" });
    expect(result.ok).toBe(false);
  });

  it("succeeds only when accepted AND payment verified", () => {
    const result = canEnroll({ status: "ACCEPTED", paymentStatus: "VERIFIED" });
    expect(result.ok).toBe(true);
  });
});

describe("admissions: publicApplicationStatusLabel", () => {
  it("shows 'Payment not verified' before payment is verified", () => {
    expect(publicApplicationStatusLabel({ status: "SUBMITTED", paymentStatus: "NOT_SUBMITTED" })).toBe(
      "Payment not verified"
    );
    expect(publicApplicationStatusLabel({ status: "SUBMITTED", paymentStatus: "PENDING_VERIFICATION" })).toBe(
      "Payment not verified"
    );
  });

  it("shows 'Under review' once payment is verified and still in review", () => {
    expect(publicApplicationStatusLabel({ status: "UNDER_REVIEW", paymentStatus: "VERIFIED" })).toBe(
      "Under review"
    );
  });

  it("shows 'Interview required'", () => {
    expect(
      publicApplicationStatusLabel({ status: "INTERVIEW_REQUIRED", paymentStatus: "VERIFIED" })
    ).toBe("Interview required");
  });

  it("shows terminal labels for Accepted, Rejected and Enrolled regardless of payment status", () => {
    expect(publicApplicationStatusLabel({ status: "ACCEPTED", paymentStatus: "VERIFIED" })).toBe("Accepted");
    expect(publicApplicationStatusLabel({ status: "REJECTED", paymentStatus: "VERIFIED" })).toBe("Rejected");
    expect(publicApplicationStatusLabel({ status: "ENROLLED", paymentStatus: "VERIFIED" })).toBe("Enrolled");
  });

  it("never leaks internal-only fields (type-level check: only status/paymentStatus accepted)", () => {
    const label = publicApplicationStatusLabel({ status: "UNDER_REVIEW", paymentStatus: "VERIFIED" });
    expect(label).not.toMatch(/note|admin|reviewer/i);
  });
});
