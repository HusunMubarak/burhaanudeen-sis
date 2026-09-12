"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function CreatePayrollPeriodForm() {
  const router = useRouter();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/payroll-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not create payroll period.");
        return;
      }
      if (data.skipped?.length > 0) {
        toast.warning(`Created, but skipped (no salary configured): ${data.skipped.join(", ")}`);
      } else {
        toast.success("Payroll period created.");
      }
      router.push(`/admin/payroll/${data.period.id}`);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-4 py-6">
        <div>
          <Label htmlFor="pp-month">Month</Label>
          <Select id="pp-month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pp-year">Year</Label>
          <Select id="pp-year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Create Payroll Period"}
        </Button>
      </CardContent>
    </Card>
  );
}
