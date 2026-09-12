"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { ValueType } from "recharts/types/component/DefaultTooltipContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonthlyPoint = { label: string; revenue: number; expenses: number };
type CategoryPoint = { category: string; amount: number };

function ghsTick(v: number) {
  return `₵${v.toLocaleString()}`;
}

/** Recharts' Tooltip formatter can receive a single value, a string,
 * or an array (stacked series) — coerce defensively to a number
 * rather than assuming the single-number shape our own data uses. */
function ghsTooltip(v: ValueType | undefined): string {
  const n = Array.isArray(v) ? Number(v[0]) : Number(v);
  return `GH₵${Number.isFinite(n) ? n.toFixed(2) : "0.00"}`;
}

export function FinanceCharts({ monthlyTrend, expensesByCategory }: { monthlyTrend: MonthlyPoint[]; expensesByCategory: CategoryPoint[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Revenue vs Expenses</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4dcc6" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={ghsTick} tick={{ fontSize: 12 }} width={70} />
              <Tooltip formatter={ghsTooltip} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0f5132" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#b91c1c" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {expensesByCategory.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-ink-soft">No expenses recorded in this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expensesByCategory} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4dcc6" />
                <XAxis type="number" tickFormatter={ghsTick} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 12 }} width={110} />
                <Tooltip formatter={ghsTooltip} />
                <Bar dataKey="amount" fill="#c9a227" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
