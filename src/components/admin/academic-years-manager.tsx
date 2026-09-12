"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type YearRow = { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean };

const EMPTY = { name: "", startDate: "", endDate: "" };

export function AcademicYearsManager({ initialYears }: { initialYears: YearRow[] }) {
  const [years, setYears] = useState(initialYears);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startEdit(y: YearRow) {
    setEditingId(y.id);
    setForm({ name: y.name, startDate: y.startDate.slice(0, 10), endDate: y.endDate.slice(0, 10) });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  }

  async function refresh() {
    const res = await fetch("/api/admin/academic-years");
    if (res.ok) setYears(await res.json());
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/academic-years/${editingId}` : "/api/admin/academic-years";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save academic year.");
        return;
      }
      toast.success(editingId ? "Academic year updated." : "Academic year added.");
      cancelEdit();
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function makeCurrent(y: YearRow) {
    const res = await fetch(`/api/admin/academic-years/${y.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCurrent: true }),
    });
    if (res.ok) {
      toast.success(`${y.name} set as current academic year.`);
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editingId ? "Edit Academic Year" : "Add Academic Year"}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="yname">Name</Label>
              <Input id="yname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. 2026/2027" />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div>
              <Label htmlFor="ystart">Start date</Label>
              <Input id="ystart" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="yend">End date</Label>
              <Input id="yend" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSubmit} disabled={saving || !form.name}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Year"}
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
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Start</th>
              <th className="px-4 py-3">End</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{y.name}</td>
                <td className="px-4 py-3">{y.startDate.slice(0, 10)}</td>
                <td className="px-4 py-3">{y.endDate.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  {y.isCurrent ? (
                    <span className="text-emerald-700">Current</span>
                  ) : (
                    <button type="button" onClick={() => makeCurrent(y)} className="text-ink-soft hover:underline">
                      Set current
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => startEdit(y)} className="text-emerald-700 hover:underline">
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
