"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StaffOption = { id: string; name: string };
type SalaryRow = {
  id: string;
  salaryType: string;
  baseSalary: string;
  effectiveDate: string;
  isActive: boolean;
  staff: { id: string; staffNumber: string; user: { name: string } };
};

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function SalaryManager({ staff, initialSalaries }: { staff: StaffOption[]; initialSalaries: SalaryRow[] }) {
  const [salaries, setSalaries] = useState(initialSalaries);
  const [form, setForm] = useState({
    staffId: staff[0]?.id ?? "",
    salaryType: "MONTHLY",
    baseSalary: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/finance/salaries");
    if (res.ok) setSalaries(await res.json());
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/salaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save salary.");
        return;
      }
      toast.success("Salary recorded — this is now the staff member's current salary.");
      setForm((f) => ({ ...f, baseSalary: "" }));
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">Set Salary</p>
          <p className="text-xs text-ink-soft">
            This creates a new salary record and supersedes the staff member&apos;s previous one — history is kept,
            never overwritten.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="sal-staff">Staff member</Label>
              <Select id="sal-staff" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })}>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="sal-type">Salary type</Label>
              <Select id="sal-type" value={form.salaryType} onChange={(e) => setForm({ ...form, salaryType: e.target.value })}>
                <option value="MONTHLY">Monthly</option>
                <option value="DAILY">Daily</option>
                <option value="HOURLY">Hourly</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="sal-amount">Base salary (GH₵)</Label>
              <Input id="sal-amount" type="number" step="0.01" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="sal-date">Effective date</Label>
              <Input id="sal-date" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })} />
            </div>
          </div>
          <Button type="button" onClick={submit} disabled={saving || !form.baseSalary || !form.staffId}>
            {saving ? "Saving…" : "Set Salary"}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Staff</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Base Salary</th>
              <th className="px-4 py-3">Effective</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{s.staff.user.name}</td>
                <td className="px-4 py-3">{s.salaryType}</td>
                <td className="px-4 py-3 font-medium">{ghs(Number(s.baseSalary))}</td>
                <td className="px-4 py-3">{new Date(s.effectiveDate).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">{s.isActive ? <span className="text-emerald-700">Current</span> : <span className="text-ink-soft">Superseded</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
