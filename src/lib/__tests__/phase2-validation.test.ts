import { describe, it, expect } from "vitest";
import {
  applicationSchema,
  paymentClaimSchema,
  admissionStatusCheckSchema,
  applicationReviewSchema,
  enrollmentSchema,
  studentSchema,
  studentImportRowSchema,
  staffSchema,
  classSchema,
  academicYearSchema,
  termSchema,
} from "@/lib/validation";

const validApplication = {
  firstName: "Amina",
  lastName: "Mahama",
  gender: "Female",
  dateOfBirth: "2016-04-12",
  guardianName: "Fatima Mahama",
  guardianPhone: "0244000000",
  levelAppliedFor: "Primary 1",
  section: "PRIMARY",
};

describe("applicationSchema", () => {
  it("accepts a valid application", () => {
    expect(applicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("rejects a missing guardian phone", () => {
    const result = applicationSchema.safeParse({ ...validApplication, guardianPhone: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid section", () => {
    const result = applicationSchema.safeParse({ ...validApplication, section: "SECONDARY" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid guardian email when provided", () => {
    const result = applicationSchema.safeParse({ ...validApplication, guardianEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("defaults nationality to Ghanaian when omitted", () => {
    const result = applicationSchema.safeParse(validApplication);
    if (result.success) expect(result.data.nationality).toBe("Ghanaian");
  });
});

describe("paymentClaimSchema", () => {
  const valid = {
    applicationNumber: "BIS-2027-00001",
    guardianPhone: "0244000000",
    payerName: "Fatima Mahama",
    payerPhone: "0244000000",
    amount: 50,
    reference: "TXN123456",
    paidAt: "2027-01-10",
  };

  it("accepts a valid payment claim", () => {
    expect(paymentClaimSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(paymentClaimSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(paymentClaimSchema.safeParse({ ...valid, amount: -10 }).success).toBe(false);
  });

  it("rejects a missing reference number", () => {
    expect(paymentClaimSchema.safeParse({ ...valid, reference: "" }).success).toBe(false);
  });
});

describe("admissionStatusCheckSchema", () => {
  it("requires both application number and guardian phone", () => {
    expect(admissionStatusCheckSchema.safeParse({ applicationNumber: "BIS-2027-00001", guardianPhone: "0244000000" }).success).toBe(true);
    expect(admissionStatusCheckSchema.safeParse({ applicationNumber: "", guardianPhone: "0244000000" }).success).toBe(false);
    expect(admissionStatusCheckSchema.safeParse({ applicationNumber: "BIS-2027-00001", guardianPhone: "" }).success).toBe(false);
  });
});

describe("applicationReviewSchema", () => {
  it("only accepts the defined review statuses (never SUBMITTED or ENROLLED directly)", () => {
    expect(applicationReviewSchema.safeParse({ status: "ACCEPTED" }).success).toBe(true);
    expect(applicationReviewSchema.safeParse({ status: "SUBMITTED" }).success).toBe(false);
    expect(applicationReviewSchema.safeParse({ status: "ENROLLED" }).success).toBe(false);
  });
});

describe("enrollmentSchema", () => {
  it("requires both a class and an academic year", () => {
    expect(enrollmentSchema.safeParse({ classId: "c1", academicYearId: "y1" }).success).toBe(true);
    expect(enrollmentSchema.safeParse({ classId: "", academicYearId: "y1" }).success).toBe(false);
    expect(enrollmentSchema.safeParse({ classId: "c1", academicYearId: "" }).success).toBe(false);
  });
});

describe("studentSchema", () => {
  const valid = {
    firstName: "Amina",
    lastName: "Mahama",
    gender: "Female",
    dateOfBirth: "2016-04-12",
    guardianName: "Fatima Mahama",
    guardianPhone: "0244000000",
  };

  it("accepts a valid student record", () => {
    expect(studentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a missing first or last name", () => {
    expect(studentSchema.safeParse({ ...valid, firstName: "" }).success).toBe(false);
    expect(studentSchema.safeParse({ ...valid, lastName: "" }).success).toBe(false);
  });
});

describe("studentImportRowSchema", () => {
  const valid = {
    firstName: "Amina",
    lastName: "Mahama",
    gender: "Male",
    dateOfBirth: "2016-04-12",
    guardianName: "Fatima Mahama",
    guardianPhone: "0244000000",
  };

  it("accepts a valid import row", () => {
    expect(studentImportRowSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid gender value", () => {
    expect(studentImportRowSchema.safeParse({ ...valid, gender: "Other" }).success).toBe(false);
  });

  it("rejects an invalid date of birth", () => {
    expect(studentImportRowSchema.safeParse({ ...valid, dateOfBirth: "not-a-date" }).success).toBe(false);
  });

  it("rejects a missing guardian phone", () => {
    expect(studentImportRowSchema.safeParse({ ...valid, guardianPhone: "" }).success).toBe(false);
  });
});

describe("staffSchema", () => {
  const valid = {
    name: "Ustaz Ibrahim",
    email: "ibrahim@burhaanudeen.test",
    category: "TEACHING",
    position: "Class Teacher",
    roles: ["TEACHER"],
  };

  it("accepts a valid staff record with at least one role", () => {
    expect(staffSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an empty roles array (system access is mandatory)", () => {
    expect(staffSchema.safeParse({ ...valid, roles: [] }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(staffSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
});

describe("classSchema", () => {
  it("accepts a valid class", () => {
    expect(classSchema.safeParse({ name: "Primary 3", section: "PRIMARY", academicYearId: "y1" }).success).toBe(true);
  });

  it("rejects an invalid section", () => {
    expect(classSchema.safeParse({ name: "Primary 3", section: "PRIMARY", academicYearId: "y1" }).success).toBe(true);
    expect(classSchema.safeParse({ name: "Primary 3", section: "SECONDARY", academicYearId: "y1" }).success).toBe(false);
  });

  it("rejects a missing academic year (D2: classes are scoped per year)", () => {
    expect(classSchema.safeParse({ name: "Primary 3", section: "PRIMARY" }).success).toBe(false);
    expect(classSchema.safeParse({ name: "Primary 3", section: "PRIMARY", academicYearId: "" }).success).toBe(false);
  });
});

describe("academicYearSchema", () => {
  it("accepts a valid academic year", () => {
    const result = academicYearSchema.safeParse({ name: "2026/2027", startDate: "2026-09-01", endDate: "2027-07-31" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing name", () => {
    const result = academicYearSchema.safeParse({ name: "", startDate: "2026-09-01", endDate: "2027-07-31" });
    expect(result.success).toBe(false);
  });
});

describe("termSchema", () => {
  it("accepts a valid term", () => {
    const result = termSchema.safeParse({
      name: "Term 1",
      academicYearId: "y1",
      startDate: "2026-09-08",
      endDate: "2026-12-12",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing academic year", () => {
    const result = termSchema.safeParse({ name: "Term 1", academicYearId: "", startDate: "2026-09-08", endDate: "2026-12-12" });
    expect(result.success).toBe(false);
  });
});
