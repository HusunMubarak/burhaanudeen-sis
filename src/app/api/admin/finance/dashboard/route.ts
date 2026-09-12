import { NextResponse } from "next/server";
import { requireModuleAccess, authErrorResponse } from "@/lib/authorize";
import { getFinanceSummary, getMonthlyTrend, getExpensesByCategory } from "@/lib/data/finance";

export async function GET(req: Request) {
  try {
    await requireModuleAccess("finance", "read");
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const range = { ...(from ? { from: new Date(from) } : {}), ...(to ? { to: new Date(to) } : {}) };

    const [summary, monthlyTrend, expensesByCategory] = await Promise.all([
      getFinanceSummary(range),
      getMonthlyTrend(6),
      getExpensesByCategory(range),
    ]);

    return NextResponse.json({ summary, monthlyTrend, expensesByCategory });
  } catch (err) {
    return authErrorResponse(err);
  }
}
