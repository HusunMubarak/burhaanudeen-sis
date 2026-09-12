import { describe, it, expect } from "vitest";
import {
  feeCategorySchema,
  feeStructureSchema,
  assignFeesSchema,
  paymentSchema,
  paymentReversalSchema,
  revenueTransactionSchema,
  expenseSchema,
  salarySchema,
  payrollPeriodSchema,
  payrollEntryUpdateSchema,
} from "@/lib/validation";

describe("feeCategorySchema", () => {
  it("accepts a valid category", () => {
    expect(feeCategorySchema.safeParse({ name: "Tuition" }).success).toBe(true);
  });

  it("rejects a missing name", () => {
    expect(feeCategorySchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("feeStructureSchema", () => {
  const valid = { academicYearId: "y1", categoryId: "c1", amount: 1250 };

  it("accepts a valid fee structure", () => {
    expect(feeStructureSchema.safeParse(valid).success).toBe(true);
  });

  it("term and class are optional (a whole-year, whole-school fee)", () => {
    expect(feeStructureSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    expect(feeStructureSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(feeStructureSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it("rejects a missing category", () => {
    expect(feeStructureSchema.safeParse({ ...valid, categoryId: "" }).success).toBe(false);
  });
});

describe("assignFeesSchema", () => {
  it("requires a class and academic year", () => {
    expect(assignFeesSchema.safeParse({ classId: "cl1", academicYearId: "y1" }).success).toBe(true);
    expect(assignFeesSchema.safeParse({ classId: "", academicYearId: "y1" }).success).toBe(false);
  });
});

describe("paymentSchema", () => {
  const valid = { studentId: "s1", amount: 800, date: "2027-01-15", method: "MOMO" };

  it("accepts a valid payment", () => {
    expect(paymentSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an invalid payment method", () => {
    expect(paymentSchema.safeParse({ ...valid, method: "CHEQUE" }).success).toBe(false);
  });

  it("accepts all four supported methods", () => {
    for (const method of ["CASH", "MOMO", "BANK", "OTHER"]) {
      expect(paymentSchema.safeParse({ ...valid, method }).success).toBe(true);
    }
  });

  it("rejects a zero or negative amount", () => {
    expect(paymentSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
  });

  it("rejects a missing student", () => {
    expect(paymentSchema.safeParse({ ...valid, studentId: "" }).success).toBe(false);
  });
});

describe("paymentReversalSchema", () => {
  it("requires a real reason, not a token gesture", () => {
    expect(paymentReversalSchema.safeParse({ reason: "Entered in error — duplicate of receipt #4021" }).success).toBe(true);
    expect(paymentReversalSchema.safeParse({ reason: "" }).success).toBe(false);
    expect(paymentReversalSchema.safeParse({ reason: "no" }).success).toBe(false);
  });
});

describe("revenueTransactionSchema", () => {
  it("accepts a valid non-fee revenue transaction", () => {
    const result = revenueTransactionSchema.safeParse({
      categoryId: "r1",
      date: "2027-01-10",
      amount: 500,
      method: "CASH",
    });
    expect(result.success).toBe(true);
  });
});

describe("expenseSchema", () => {
  it("accepts a valid expense", () => {
    const result = expenseSchema.safeParse({
      categoryId: "e1",
      date: "2027-01-10",
      amount: 2000,
      method: "BANK",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a non-https receipt URL (A7-style guard)", () => {
    const result = expenseSchema.safeParse({
      categoryId: "e1",
      date: "2027-01-10",
      amount: 2000,
      method: "BANK",
      receiptUrl: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });
});

describe("salarySchema", () => {
  it("accepts a valid salary record", () => {
    const result = salarySchema.safeParse({
      staffId: "st1",
      salaryType: "MONTHLY",
      baseSalary: 3500,
      effectiveDate: "2027-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid salary type", () => {
    const result = salarySchema.safeParse({
      staffId: "st1",
      salaryType: "WEEKLY",
      baseSalary: 3500,
      effectiveDate: "2027-01-01",
    });
    expect(result.success).toBe(false);
  });
});

describe("payrollPeriodSchema", () => {
  it("accepts a valid month/year", () => {
    expect(payrollPeriodSchema.safeParse({ month: 1, year: 2027 }).success).toBe(true);
  });

  it("rejects month 0 or month 13", () => {
    expect(payrollPeriodSchema.safeParse({ month: 0, year: 2027 }).success).toBe(false);
    expect(payrollPeriodSchema.safeParse({ month: 13, year: 2027 }).success).toBe(false);
  });
});

describe("payrollEntryUpdateSchema", () => {
  it("accepts zero deductions", () => {
    expect(payrollEntryUpdateSchema.safeParse({ deductions: 0 }).success).toBe(true);
  });

  it("rejects negative deductions", () => {
    expect(payrollEntryUpdateSchema.safeParse({ deductions: -50 }).success).toBe(false);
  });
});
