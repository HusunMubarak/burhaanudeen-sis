import { describe, it, expect } from "vitest";
import {
  sumExpected,
  sumPaid,
  calculateBalance,
  buildStudentFeeLedger,
  calculateGross,
  calculateNet,
  calculatePayrollEntry,
  sumPayrollNet,
  sumPayrollGross,
  calculateTotalRevenue,
  calculateTotalExpenses,
  calculateNetOperatingBalance,
  calculateCollectionRate,
  canTransitionPayrollPeriod,
} from "@/lib/finance";

describe("student fee ledger", () => {
  it("matches the spec's worked example: expected 1250, paid 800, balance 450", () => {
    const ledger = buildStudentFeeLedger([{ amount: 1250 }], [{ amount: 800, status: "COMPLETED" }]);
    expect(ledger).toEqual({ expected: 1250, paid: 800, balance: 450 });
  });

  it("sums multiple fee line items for expected", () => {
    expect(sumExpected([{ amount: 500 }, { amount: 300 }, { amount: 150 }])).toBe(950);
  });

  it("sums multiple payments for paid", () => {
    expect(sumPaid([
      { amount: 400, status: "COMPLETED" },
      { amount: 300, status: "COMPLETED" },
    ])).toBe(700);
  });

  it("excludes REVERSED payments from paid — a reversal stops counting toward the balance", () => {
    const paid = sumPaid([
      { amount: 800, status: "COMPLETED" },
      { amount: 800, status: "REVERSED" }, // mistaken duplicate, later reversed
    ]);
    expect(paid).toBe(800);
  });

  it("a fully reversed payment leaves the balance as if it never happened", () => {
    const ledger = buildStudentFeeLedger(
      [{ amount: 1250 }],
      [{ amount: 1250, status: "REVERSED" }]
    );
    expect(ledger.paid).toBe(0);
    expect(ledger.balance).toBe(1250);
  });

  it("balance can go negative on overpayment — not clamped to zero", () => {
    expect(calculateBalance(1000, 1200)).toBe(-200);
  });

  it("zero fee assignments and zero payments gives a zero ledger, not an error", () => {
    expect(buildStudentFeeLedger([], [])).toEqual({ expected: 0, paid: 0, balance: 0 });
  });
});

describe("payroll calculation", () => {
  it("gross equals the base salary as-is", () => {
    expect(calculateGross(3500)).toBe(3500);
  });

  it("net is gross minus deductions", () => {
    expect(calculateNet(3500, 200)).toBe(3300);
  });

  it("calculatePayrollEntry with no deductions: net equals gross", () => {
    expect(calculatePayrollEntry(3500)).toEqual({ gross: 3500, deductions: 0, net: 3500 });
  });

  it("calculatePayrollEntry with deductions configured", () => {
    expect(calculatePayrollEntry(3500, 250)).toEqual({ gross: 3500, deductions: 250, net: 3250 });
  });

  it("sums net across a payroll run — this is what gets expensed on PAID", () => {
    const entries = [{ netAmount: 3300 }, { netAmount: 2800 }, { netAmount: 1500 }];
    expect(sumPayrollNet(entries)).toBe(7600);
  });

  it("sums gross across a payroll run separately from net", () => {
    const entries = [{ grossAmount: 3500 }, { grossAmount: 3000 }];
    expect(sumPayrollGross(entries)).toBe(6500);
  });
});

describe("revenue, expenses, net operating balance", () => {
  it("verifies the spec's worked example: revenue 100,000, expenses 60,000, net 40,000", () => {
    const totalRevenue = calculateTotalRevenue(80_000, 20_000);
    const totalExpenses = calculateTotalExpenses([{ amount: 35_000 }, { amount: 25_000 }]);
    expect(totalRevenue).toBe(100_000);
    expect(totalExpenses).toBe(60_000);
    expect(calculateNetOperatingBalance(totalRevenue, totalExpenses)).toBe(40_000);
  });

  it("combines fee payments and other revenue without double counting either", () => {
    expect(calculateTotalRevenue(50_000, 0)).toBe(50_000);
    expect(calculateTotalRevenue(0, 12_000)).toBe(12_000);
  });

  it("net operating balance can be negative (expenses exceeded revenue)", () => {
    expect(calculateNetOperatingBalance(40_000, 55_000)).toBe(-15_000);
  });

  it("sums expenses across categories (e.g. salaries + utilities + rent)", () => {
    const expenses = [{ amount: 15_000 }, { amount: 2_000 }, { amount: 5_000 }];
    expect(calculateTotalExpenses(expenses)).toBe(22_000);
  });
});

describe("collection rate", () => {
  it("computes a straightforward percentage", () => {
    expect(calculateCollectionRate(1000, 800)).toBe(80);
  });

  it("returns 0 rather than NaN/Infinity when nothing is expected yet", () => {
    expect(calculateCollectionRate(0, 0)).toBe(0);
  });

  it("can exceed 100% on overpayment across the whole school", () => {
    expect(calculateCollectionRate(1000, 1100)).toBe(110);
  });
});

describe("payroll period workflow (Draft -> Review -> Process -> Paid)", () => {
  it("allows the ordinary forward progression, one step at a time", () => {
    expect(canTransitionPayrollPeriod("DRAFT", "REVIEW")).toBe(true);
    expect(canTransitionPayrollPeriod("REVIEW", "PROCESSED")).toBe(true);
    expect(canTransitionPayrollPeriod("PROCESSED", "PAID")).toBe(true);
  });

  it("rejects skipping straight from DRAFT to PAID", () => {
    expect(canTransitionPayrollPeriod("DRAFT", "PAID")).toBe(false);
    expect(canTransitionPayrollPeriod("DRAFT", "PROCESSED")).toBe(false);
  });

  it("rejects skipping from REVIEW straight to PAID", () => {
    expect(canTransitionPayrollPeriod("REVIEW", "PAID")).toBe(false);
  });

  it("PAID is terminal — no transitions out, including back to DRAFT", () => {
    expect(canTransitionPayrollPeriod("PAID", "DRAFT")).toBe(false);
    expect(canTransitionPayrollPeriod("PAID", "REVIEW")).toBe(false);
    expect(canTransitionPayrollPeriod("PAID", "PROCESSED")).toBe(false);
  });

  it("rejects moving backward at any step", () => {
    expect(canTransitionPayrollPeriod("REVIEW", "DRAFT")).toBe(false);
    expect(canTransitionPayrollPeriod("PROCESSED", "REVIEW")).toBe(false);
  });
});
