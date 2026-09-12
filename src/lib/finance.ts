/**
 * Pure financial calculation logic, kept free of Prisma/DB imports so
 * it's directly unit-testable — same pattern as src/lib/admissions.ts
 * and src/lib/students.ts. Routes fetch the raw numbers from the
 * database and pass them in here; nothing in this file trusts a
 * client-supplied total.
 */

/** The exact ExpenseCategory.name used for the auto-generated payroll
 * expense — must match prisma/seed.ts's expense category seed list.
 * Kept as a single named constant so the payroll route and the seed
 * script can never drift out of sync. */
export const PAYROLL_EXPENSE_CATEGORY = "Staff Salaries";

// ---------------------------------------------------------------------------
// STUDENT FEE LEDGER
// ---------------------------------------------------------------------------

/** Expected total for a student — sum of their StudentFeeAssignment amounts. */
export function sumExpected(assignments: { amount: number }[]): number {
  return round2(assignments.reduce((sum, a) => sum + a.amount, 0));
}

/** Paid total for a student — only COMPLETED payments count; a REVERSED
 * payment no longer contributes to what's been paid (C4-style
 * financial-integrity rule: nothing is silently edited, but a
 * reversed payment must stop counting toward the balance). */
export function sumPaid(payments: { amount: number; status: "COMPLETED" | "REVERSED" }[]): number {
  return round2(payments.filter((p) => p.status === "COMPLETED").reduce((sum, p) => sum + p.amount, 0));
}

export function calculateBalance(expected: number, paid: number): number {
  return round2(expected - paid);
}

export type StudentFeeLedger = { expected: number; paid: number; balance: number };

export function buildStudentFeeLedger(
  assignments: { amount: number }[],
  payments: { amount: number; status: "COMPLETED" | "REVERSED" }[]
): StudentFeeLedger {
  const expected = sumExpected(assignments);
  const paid = sumPaid(payments);
  return { expected, paid, balance: calculateBalance(expected, paid) };
}

// ---------------------------------------------------------------------------
// PAYROLL
// ---------------------------------------------------------------------------

/** Gross is the base salary snapshot as-is (Phase 3 doesn't model
 * overtime/bonuses) — kept as its own function so the "gross = base"
 * relationship is explicit and testable rather than assumed inline. */
export function calculateGross(baseSalary: number): number {
  return round2(baseSalary);
}

export function calculateNet(gross: number, deductions: number): number {
  return round2(gross - deductions);
}

export type PayrollCalculation = { gross: number; deductions: number; net: number };

export function calculatePayrollEntry(baseSalary: number, deductions: number = 0): PayrollCalculation {
  const gross = calculateGross(baseSalary);
  return { gross, deductions: round2(deductions), net: calculateNet(gross, deductions) };
}

/** Total cash cost of a payroll run — what actually gets expensed
 * when the period is marked PAID. Cash-basis: deductions withheld
 * aren't separately tracked as a liability in Phase 3, so the expense
 * booked is the net amount actually disbursed, not the gross cost —
 * see the payroll expense route for the full rationale. */
export function sumPayrollNet(entries: { netAmount: number }[]): number {
  return round2(entries.reduce((sum, e) => sum + e.netAmount, 0));
}

export function sumPayrollGross(entries: { grossAmount: number }[]): number {
  return round2(entries.reduce((sum, e) => sum + e.grossAmount, 0));
}

// ---------------------------------------------------------------------------
// REVENUE, EXPENSES, DASHBOARD TOTALS
// ---------------------------------------------------------------------------

/**
 * Total revenue combines student fee payments (Payment, COMPLETED
 * only) with non-fee revenue (RevenueTransaction) — deliberately two
 * separate sums rather than one query, so a payment can never also be
 * double-entered as a RevenueTransaction and counted twice.
 */
export function calculateTotalRevenue(feesCollected: number, otherRevenue: number): number {
  return round2(feesCollected + otherRevenue);
}

export function calculateTotalExpenses(expenses: { amount: number }[]): number {
  return round2(expenses.reduce((sum, e) => sum + e.amount, 0));
}

export function calculateNetOperatingBalance(totalRevenue: number, totalExpenses: number): number {
  return round2(totalRevenue - totalExpenses);
}

/** Collection rate as a 0-100 percentage; 0 expected -> 0% rather than
 * NaN/Infinity from a divide-by-zero. */
export function calculateCollectionRate(expected: number, collected: number): number {
  if (expected <= 0) return 0;
  return round2((collected / expected) * 100);
}

/** Rounds to 2 decimal places using string-based rounding to avoid
 * classic floating-point artifacts (e.g. 0.1 + 0.2) — amounts here
 * are cedis, always displayed/compared to the pesewa. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ---------------------------------------------------------------------------
// PAYROLL PERIOD WORKFLOW
// ---------------------------------------------------------------------------

export type PayrollPeriodStatus = "DRAFT" | "REVIEW" | "PROCESSED" | "PAID";

/** Strictly forward, one step at a time: Draft -> Review -> Process ->
 * Paid. No skipping (DRAFT can't jump to PAID) and no going back
 * (PAID is terminal) — if something needs fixing before PROCESSED,
 * deductions can still be edited in DRAFT/REVIEW; once PROCESSED the
 * numbers are final because PAID immediately books an expense from
 * them. */
const PAYROLL_TRANSITIONS: Record<PayrollPeriodStatus, PayrollPeriodStatus[]> = {
  DRAFT: ["REVIEW"],
  REVIEW: ["PROCESSED"],
  PROCESSED: ["PAID"],
  PAID: [],
};

export function canTransitionPayrollPeriod(from: PayrollPeriodStatus, to: PayrollPeriodStatus): boolean {
  return PAYROLL_TRANSITIONS[from]?.includes(to) ?? false;
}
