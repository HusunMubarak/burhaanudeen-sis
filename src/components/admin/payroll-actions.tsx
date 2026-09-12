"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type Entry = {
  id: string;
  deductions: string;
  grossAmount: string;
  netAmount: string;
  staff: { id: string; staffNumber: string; position: string; user: { name: string } };
};

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PayrollEntryRow({ periodId, entry, editable }: { periodId: string; entry: Entry; editable: boolean }) {
  const router = useRouter();
  const [deductions, setDeductions] = useState(entry.deductions);
  const [saving, setSaving] = useState(false);

  async function saveDeductions() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/finance/payroll-periods/${periodId}/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deductions }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update deductions.");
        return;
      }
      toast.success("Deductions updated.");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-4 py-3">
        <p className="font-medium text-ink">{entry.staff.user.name}</p>
        <p className="text-xs text-ink-soft">{entry.staff.position}</p>
      </td>
      <td className="px-4 py-3">{ghs(Number(entry.grossAmount))}</td>
      <td className="px-4 py-3">
        {editable ? (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="0.01"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              className="w-28"
            />
            <Button type="button" size="sm" variant="outline" onClick={saveDeductions} disabled={saving}>
              {saving ? "…" : "Save"}
            </Button>
          </div>
        ) : (
          ghs(Number(entry.deductions))
        )}
      </td>
      <td className="px-4 py-3 font-semibold text-emerald-700">{ghs(Number(entry.netAmount))}</td>
    </tr>
  );
}

export function PayrollTransitionButton({ periodId, targetStatus, label }: { periodId: string; targetStatus: string; label: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (targetStatus === "PAID" && !confirm("Mark this payroll as paid? This will create a Staff Salaries expense and cannot be undone.")) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/finance/payroll-periods/${periodId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update status.");
        return;
      }
      toast.success(`Payroll period moved to ${targetStatus}.`);
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Button type="button" onClick={submit} disabled={saving} variant={targetStatus === "PAID" ? "primary" : "outline"}>
      {saving ? "Working…" : label}
    </Button>
  );
}
