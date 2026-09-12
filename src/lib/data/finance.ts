import "server-only";
import { prisma } from "@/lib/prisma";
import {
  buildStudentFeeLedger,
  calculateTotalRevenue,
  calculateTotalExpenses,
  calculateNetOperatingBalance,
  calculateCollectionRate,
} from "@/lib/finance";

export type DateRangeFilter = { from?: Date; to?: Date };

function dateWhere(field: string, range: DateRangeFilter) {
  if (!range.from && !range.to) return {};
  return { [field]: { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) } };
}

/**
 * The dashboard's top-line numbers. Total Fees Expected/Collected are
 * school-wide sums of StudentFeeAssignment/Payment; Other Revenue and
 * Total Expenses come from their own transaction tables — see
 * lib/finance.ts#calculateTotalRevenue for why fee payments and
 * RevenueTransaction are summed separately rather than merged into
 * one query (avoids ever double-counting a fee payment as revenue).
 */
export async function getFinanceSummary(range: DateRangeFilter = {}) {
  const [assignments, payments, revenueAgg, expenses] = await Promise.all([
    prisma.studentFeeAssignment.findMany({ select: { amount: true } }),
    prisma.payment.findMany({
      where: dateWhere("date", range),
      select: { amount: true, status: true },
    }),
    prisma.revenueTransaction.aggregate({
      where: dateWhere("date", range),
      _sum: { amount: true },
    }),
    prisma.expense.findMany({
      where: dateWhere("date", range),
      include: { category: { select: { name: true } } },
    }),
  ]);

  const ledger = buildStudentFeeLedger(
    assignments.map((a) => ({ amount: Number(a.amount) })),
    payments.map((p) => ({ amount: Number(p.amount), status: p.status }))
  );

  const otherRevenue = Number(revenueAgg._sum.amount ?? 0);
  const totalRevenue = calculateTotalRevenue(ledger.paid, otherRevenue);

  const expenseRows = expenses.map((e) => ({ amount: Number(e.amount) }));
  const totalExpenses = calculateTotalExpenses(expenseRows);

  const salariesPaid = expenses
    .filter((e) => e.category.name === "Staff Salaries")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const otherExpenses = totalExpenses - salariesPaid;

  return {
    totalFeesExpected: ledger.expected,
    totalFeesCollected: ledger.paid,
    outstandingFees: ledger.balance,
    collectionRate: calculateCollectionRate(ledger.expected, ledger.paid),
    otherRevenue,
    totalRevenue,
    totalExpenses,
    salariesPaid: Math.round(salariesPaid * 100) / 100,
    otherExpenses: Math.round(otherExpenses * 100) / 100,
    netOperatingBalance: calculateNetOperatingBalance(totalRevenue, totalExpenses),
  };
}

/** Expense totals grouped by category, for the "Expense categories" chart. */
export async function getExpensesByCategory(range: DateRangeFilter = {}) {
  const expenses = await prisma.expense.findMany({
    where: dateWhere("date", range),
    include: { category: { select: { name: true } } },
  });
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category.name, (byCategory.get(e.category.name) ?? 0) + Number(e.amount));
  }
  return Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }));
}

/** Revenue and expenses bucketed by month, for the "Monthly
 * revenue"/"Monthly expenses" charts. Returns the last `months`
 * calendar months up to and including the current one. */
export async function getMonthlyTrend(months: number = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [payments, revenue, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: { date: { gte: start }, status: "COMPLETED" },
      select: { amount: true, date: true },
    }),
    prisma.revenueTransaction.findMany({ where: { date: { gte: start } }, select: { amount: true, date: true } }),
    prisma.expense.findMany({ where: { date: { gte: start } }, select: { amount: true, date: true } }),
  ]);

  const buckets: { label: string; revenue: number; expenses: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), revenue: 0, expenses: 0 });
  }

  const bucketIndex = (date: Date) => months - 1 - (now.getFullYear() * 12 + now.getMonth() - (date.getFullYear() * 12 + date.getMonth()));

  for (const p of payments) {
    const idx = bucketIndex(p.date);
    if (idx >= 0 && idx < months) buckets[idx].revenue += Number(p.amount);
  }
  for (const r of revenue) {
    const idx = bucketIndex(r.date);
    if (idx >= 0 && idx < months) buckets[idx].revenue += Number(r.amount);
  }
  for (const e of expenses) {
    const idx = bucketIndex(e.date);
    if (idx >= 0 && idx < months) buckets[idx].expenses += Number(e.amount);
  }

  return buckets.map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100, expenses: Math.round(b.expenses * 100) / 100 }));
}

export type OwingListParams = {
  q?: string;
  classId?: string;
  academicYearId?: string;
  termId?: string;
  minBalance?: number;
  maxBalance?: number;
  sort?: "balance-desc" | "balance-asc" | "name" | "class";
  page?: number;
  pageSize?: number;
};

/**
 * "Students Owing" report — computed in application code rather than
 * SQL aggregation, since balance = expected - paid spans two tables
 * and Payment.status must exclude REVERSED rows. For a school this
 * size (150-250 students) this is fast enough; if it ever needs to
 * scale further, the same lib/finance.ts functions could back a
 * materialized view instead without changing any call site.
 */
export async function listStudentsOwing(params: OwingListParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const students = await prisma.student.findMany({
    where: {
      status: { in: ["ACTIVE", "ENROLLED"] },
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.q
        ? {
            OR: [
              { firstName: { contains: params.q, mode: "insensitive" } },
              { lastName: { contains: params.q, mode: "insensitive" } },
              { admissionNumber: { contains: params.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      class: { select: { id: true, name: true } },
      feeAssignments: {
        where: {
          ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
          ...(params.termId ? { termId: params.termId } : {}),
        },
        select: { amount: true },
      },
      payments: {
        where: {
          ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
          ...(params.termId ? { termId: params.termId } : {}),
        },
        select: { amount: true, status: true },
      },
    },
  });

  let rows = students.map((s) => {
    const ledger = buildStudentFeeLedger(
      s.feeAssignments.map((a) => ({ amount: Number(a.amount) })),
      s.payments.map((p) => ({ amount: Number(p.amount), status: p.status }))
    );
    return {
      id: s.id,
      admissionNumber: s.admissionNumber,
      name: `${s.lastName}, ${s.firstName}`,
      className: s.class?.name ?? "Unassigned",
      ...ledger,
    };
  });

  // Only students who actually owe something belong on this report.
  rows = rows.filter((r) => r.balance > 0);

  if (params.minBalance !== undefined) rows = rows.filter((r) => r.balance >= params.minBalance!);
  if (params.maxBalance !== undefined) rows = rows.filter((r) => r.balance <= params.maxBalance!);

  const sort = params.sort ?? "balance-desc";
  rows.sort((a, b) => {
    if (sort === "balance-desc") return b.balance - a.balance;
    if (sort === "balance-asc") return a.balance - b.balance;
    if (sort === "class") return a.className.localeCompare(b.className);
    return a.name.localeCompare(b.name);
  });

  const total = rows.length;
  const totalOwing = Math.round(rows.reduce((sum, r) => sum + r.balance, 0) * 100) / 100;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  return { rows: paged, total, totalOwing, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}
