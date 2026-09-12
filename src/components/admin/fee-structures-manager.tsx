"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Option = { id: string; name: string };
type StructureRow = {
  id: string;
  amount: string;
  isActive: boolean;
  academicYear: { name: string };
  term: { name: string } | null;
  class: { name: string } | null;
  category: { name: string };
};

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function FeeStructuresManager({
  initialStructures,
  years,
  terms,
  classes,
  categories,
}: {
  initialStructures: StructureRow[];
  years: Option[];
  terms: (Option & { academicYearId: string })[];
  classes: Option[];
  categories: Option[];
}) {
  const [structures, setStructures] = useState(initialStructures);
  const [form, setForm] = useState({
    academicYearId: years[0]?.id ?? "",
    termId: "",
    classId: "",
    categoryId: categories[0]?.id ?? "",
    amount: "",
  });
  const [saving, setSaving] = useState(false);

  const relevantTerms = terms.filter((t) => t.academicYearId === form.academicYearId);

  async function refresh() {
    const res = await fetch(`/api/admin/finance/fee-structures?academicYearId=${form.academicYearId}`);
    if (res.ok) setStructures(await res.json());
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/fee-structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: form.academicYearId,
          termId: form.termId || null,
          classId: form.classId || null,
          categoryId: form.categoryId,
          amount: form.amount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not add fee structure.");
        return;
      }
      toast.success("Fee structure added.");
      setForm((f) => ({ ...f, amount: "" }));
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
          <p className="font-display text-lg font-semibold text-ink">Add Fee Structure</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="fs-year">Academic year</Label>
              <Select id="fs-year" value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value, termId: "" })}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fs-term">Term (optional — blank = whole year)</Label>
              <Select id="fs-term" value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
                <option value="">Whole year</option>
                {relevantTerms.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fs-class">Class (optional — blank = all classes)</Label>
              <Select id="fs-class" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fs-category">Category</Label>
              <Select id="fs-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fs-amount">Amount (GH₵)</Label>
              <Input id="fs-amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <Button type="button" onClick={submit} disabled={saving || !form.amount || !form.categoryId}>
            {saving ? "Saving…" : "Add Fee Structure"}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {structures.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{s.academicYear.name}</td>
                <td className="px-4 py-3">{s.term?.name ?? "Whole year"}</td>
                <td className="px-4 py-3">{s.class?.name ?? "All classes"}</td>
                <td className="px-4 py-3">{s.category.name}</td>
                <td className="px-4 py-3 font-medium">{ghs(Number(s.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
