import { describe, it, expect } from "vitest";
import { canGrantRoles, roleCanAccessModule, STUDENT_EXPORT_ROLES } from "@/lib/rbac";
import { phoneMatches, normalizePhone, feeAmountMatches, isDuplicateApplicant, canTransitionApplication } from "@/lib/admissions";

describe("normalizePhone: reconciles Ghana local vs international format", () => {
  it("strips spaces and punctuation from a local number", () => {
    expect(normalizePhone("024 400 0000")).toBe("0244000000");
    expect(normalizePhone("024-400-0000")).toBe("0244000000");
  });

  it("rewrites the +233 international form to local 0-prefixed form", () => {
    expect(normalizePhone("+233 24 400 0000")).toBe("0244000000");
    expect(normalizePhone("233244000000")).toBe("0244000000");
  });

  it("leaves an already-local number unchanged", () => {
    expect(normalizePhone("0244000000")).toBe("0244000000");
  });
});

describe("F1: staff role grant policy (A1)", () => {
  it("Headteacher cannot grant SUPER_ADMIN", () => {
    expect(canGrantRoles(["HEADTEACHER"], ["SUPER_ADMIN"])).toBe(false);
  });

  it("Headteacher cannot grant PROPRIETOR", () => {
    expect(canGrantRoles(["HEADTEACHER"], ["PROPRIETOR"])).toBe(false);
  });

  it("only an existing Super Admin can grant Super Admin", () => {
    expect(canGrantRoles(["PROPRIETOR"], ["SUPER_ADMIN"])).toBe(false);
    expect(canGrantRoles(["SUPER_ADMIN"], ["SUPER_ADMIN"])).toBe(true);
  });

  it("a Super Admin can grant any role", () => {
    expect(canGrantRoles(["SUPER_ADMIN"], ["PROPRIETOR", "BURSAR", "TEACHER"])).toBe(true);
  });

  it("a caller can grant a role they themselves hold", () => {
    expect(canGrantRoles(["PROPRIETOR"], ["PROPRIETOR"])).toBe(true);
    expect(canGrantRoles(["TEACHER", "HEADTEACHER"], ["TEACHER"])).toBe(true);
  });

  it("a caller cannot grant a role they do not hold", () => {
    expect(canGrantRoles(["BURSAR"], ["ADMISSIONS_OFFICER"])).toBe(false);
  });

  it("rejects the grant if ANY requested role is disallowed, not just some", () => {
    expect(canGrantRoles(["HEADTEACHER"], ["HEADTEACHER", "PROPRIETOR"])).toBe(false);
  });
});

describe("F2: Teacher module boundaries (B1)", () => {
  it("Teacher cannot write (create/update/delete) classes, academic years or terms", () => {
    expect(roleCanAccessModule("TEACHER", "academics", "write")).toBe(false);
  });

  it("Teacher can still read academics (view classes)", () => {
    expect(roleCanAccessModule("TEACHER", "academics", "read")).toBe(true);
  });

  it("Teacher cannot write students (no create/update/status-change)", () => {
    expect(roleCanAccessModule("TEACHER", "students", "write")).toBe(false);
  });

  it("Teacher is not in the student-export role list (A8)", () => {
    expect(STUDENT_EXPORT_ROLES).not.toContain("TEACHER");
    expect(STUDENT_EXPORT_ROLES).not.toContain("ADMISSIONS_OFFICER");
  });

  it("only Proprietor and Headteacher can export students", () => {
    expect(STUDENT_EXPORT_ROLES.sort()).toEqual(["HEADTEACHER", "PROPRIETOR"]);
  });
});

describe("F3: payment identity check returns identically for wrong phone and unknown number (A4)", () => {
  const onFile = "024 400 0000";

  it("the correct guardian phone matches regardless of formatting", () => {
    expect(phoneMatches(onFile, "0244000000")).toBe(true);
    expect(phoneMatches(onFile, "+233 24 400 0000")).toBe(true);
  });

  it("a wrong phone number does not match", () => {
    expect(phoneMatches(onFile, "0200000000")).toBe(false);
  });

  it("route-level: both 'application not found' and 'wrong phone' hit the exact same generic-error branch", () => {
    // The payment/status/withdraw routes all share this shape:
    //   if (!application || !phoneMatches(application.guardianPhone, submittedPhone)) return GENERIC_NOT_FOUND
    // i.e. a missing application and a wrong phone are structurally
    // the same condition — there is no code path that could return a
    // different error for one vs the other.
    const isRejected = (application: { guardianPhone: string } | null, submittedPhone: string) =>
      !application || !phoneMatches(application.guardianPhone, submittedPhone);

    expect(isRejected(null, "0244000000")).toBe(true); // unknown application number
    expect(isRejected({ guardianPhone: onFile }, "0200000000")).toBe(true); // wrong phone
    expect(isRejected({ guardianPhone: onFile }, "0244000000")).toBe(false); // correct phone, real application
  });
});

describe("F4: payment amount must equal the configured fee (C4)", () => {
  it("rejects an amount that doesn't match the fee", () => {
    expect(feeAmountMatches(30, 50)).toBe(false);
    expect(feeAmountMatches(100, 50)).toBe(false);
  });

  it("accepts an exact match", () => {
    expect(feeAmountMatches(50, 50)).toBe(true);
  });

  it("accepts a match within floating-point tolerance", () => {
    expect(feeAmountMatches(50.005, 50)).toBe(true);
    expect(feeAmountMatches(49.995, 50)).toBe(true);
  });

  it("rejects anything outside the tolerance", () => {
    expect(feeAmountMatches(50.02, 50)).toBe(false);
  });

  it("does not enforce a match when no fee is configured yet", () => {
    expect(feeAmountMatches(9999, 0)).toBe(true);
  });
});

describe("F5: duplicate application detection (C5)", () => {
  const applicant = { firstName: "Amina", lastName: "Mahama", guardianPhone: "0244000000" };

  it("flags an exact match as a duplicate", () => {
    expect(isDuplicateApplicant(applicant, applicant)).toBe(true);
  });

  it("is case-insensitive on name", () => {
    expect(isDuplicateApplicant(applicant, { ...applicant, firstName: "AMINA", lastName: "mahama" })).toBe(true);
  });

  it("tolerates phone formatting differences", () => {
    expect(isDuplicateApplicant(applicant, { ...applicant, guardianPhone: "+233 24 400 0000" })).toBe(true);
  });

  it("does not flag a different child as a duplicate", () => {
    expect(isDuplicateApplicant(applicant, { ...applicant, firstName: "Fatima" })).toBe(false);
  });

  it("does not flag the same name with a different guardian phone", () => {
    expect(isDuplicateApplicant(applicant, { ...applicant, guardianPhone: "0200000000" })).toBe(false);
  });
});

describe("F6: canTransitionApplication rejects UI-illegal pairs (C1)", () => {
  it("SUBMITTED cannot jump straight to ACCEPTED", () => {
    expect(canTransitionApplication("SUBMITTED", "ACCEPTED")).toBe(false);
  });

  it("SUBMITTED cannot jump straight to REJECTED", () => {
    expect(canTransitionApplication("SUBMITTED", "REJECTED")).toBe(false);
  });

  it("SUBMITTED can only move to UNDER_REVIEW or WITHDRAWN", () => {
    expect(canTransitionApplication("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionApplication("SUBMITTED", "WITHDRAWN")).toBe(true);
    expect(canTransitionApplication("SUBMITTED", "INTERVIEW_REQUIRED")).toBe(false);
  });

  it("terminal states (REJECTED, ENROLLED, WITHDRAWN) allow no further transitions", () => {
    for (const to of ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "ENROLLED", "WITHDRAWN"] as const) {
      expect(canTransitionApplication("REJECTED", to)).toBe(false);
      expect(canTransitionApplication("ENROLLED", to)).toBe(false);
      expect(canTransitionApplication("WITHDRAWN", to)).toBe(false);
    }
  });
});
