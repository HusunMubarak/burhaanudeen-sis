"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type TermRow = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  academicYearId: string;
  academicYear: { id: string; name: string };
};

type Option = { id: string; name: string };

function empty(defaultYearId: string) {
  return { name: "", startDate: "", endDate: "", academicYearId: defaultYearId };
}

export function TermsManager({ initialTerms, years }: { initialTerms: TermRow[]; years: Option[] }) {
  const [terms, setTerms] = useState(initialTerms);
  const [form, setForm] = useState(empty(years[0]?.id ?? ""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startEdit(t: TermRow) {
    setEditingId(t.id);
    setForm({ name: t.name, startDate: t.startDate.slice(0, 10), endDate: t.endDate.slice(0, 10), academicYearId: t.academicYearId });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(empty(years[0]?.id ?? ""));
    setErrors({});
  }

  async function refresh() {
    const res = await fetch("/api/admin/terms");
    if (res.ok) setTerms(await res.json());
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/terms/${editingId}` : "/api/admin/terms";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save term.");
        return;
      }
      toast.success(editingId ? "Term updated." : "Term added.");
      cancelEdit();
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function makeCurrent(t: TermRow) {
    const res = await fetch(`/api/admin/terms/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCurrent: true, academicYearId: t.academicYearId }),
    });
    if (res.ok) {
      toast.success(`${t.name} set as current term.`);
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editingId ? "Edit Term" : "Add Term"}</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="tname">Name</Label>
              <Input id="tname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Term 1" />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div>
              <Label htmlFor="tyear">Academic year</Label>
              <Select id="tyear" value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tstart">Start date</Label>
              <Input id="tstart" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tend">End date</Label>
              <Input id="tend" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSubmit} disabled={saving || !form.name || !form.academicYearId}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Term"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Academic Year</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {terms.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{t.name}</td>
                <td className="px-4 py-3">{t.academicYear.name}</td>
                <td className="px-4 py-3">{t.startDate.slice(0, 10)}</td>
                <td className="px-4 py-3">{t.endDate.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  {t.isCurrent ? (
                    <span className="text-emerald-700">Current</span>
                  ) : (
                    <button type="button" onClick={() => makeCurrent(t)} className="text-ink-soft hover:underline">
                      Set current
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => startEdit(t)} className="text-emerald-700 hover:underline">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
