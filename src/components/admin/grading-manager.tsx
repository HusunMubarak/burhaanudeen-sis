"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/card";

type ScaleRow = { id: string; minScore: number; maxScore: number; grade: string; remark: string; isActive: boolean };

const EMPTY = { minScore: "", maxScore: "", grade: "", remark: "" };

export function GradingManager({ initialScales }: { initialScales: ScaleRow[] }) {
  const [scales, setScales] = useState(initialScales);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startEdit(s: ScaleRow) {
    setEditingId(s.id);
    setForm({ minScore: String(s.minScore), maxScore: String(s.maxScore), grade: s.grade, remark: s.remark });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  }

  async function refresh() {
    const res = await fetch("/api/admin/grade-scales");
    if (res.ok) setScales(await res.json());
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/grade-scales/${editingId}` : "/api/admin/grade-scales";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save grade band.");
        return;
      }
      toast.success(editingId ? "Grade band updated." : "Grade band added.");
      cancelEdit();
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: ScaleRow) {
    const res = await fetch(`/api/admin/grade-scales/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error ?? "Could not update.");
      return;
    }
    await refresh();
  }

  async function remove(s: ScaleRow) {
    if (!confirm(`Delete the "${s.grade}" grade band?`)) return;
    const res = await fetch(`/api/admin/grade-scales/${s.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Grade band deleted.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editingId ? "Edit Grade Band" : "Add Grade Band"}</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label htmlFor="gmin">Min score</Label>
              <Input id="gmin" type="number" value={form.minScore} onChange={(e) => setForm({ ...form, minScore: e.target.value })} />
              {errors.minScore && <FieldError>{errors.minScore}</FieldError>}
            </div>
            <div>
              <Label htmlFor="gmax">Max score</Label>
              <Input id="gmax" type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ggrade">Grade</Label>
              <Input id="ggrade" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. A" />
              {errors.grade && <FieldError>{errors.grade}</FieldError>}
            </div>
            <div>
              <Label htmlFor="gremark">Remark</Label>
              <Input id="gremark" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} placeholder="e.g. Excellent" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSubmit} disabled={saving || !form.minScore || !form.maxScore || !form.grade}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Band"}
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
              <th className="px-4 py-3">Range</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Remark</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {scales.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{s.minScore} – {s.maxScore}</td>
                <td className="px-4 py-3 font-medium text-ink">{s.grade}</td>
                <td className="px-4 py-3">{s.remark || "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={s.isActive ? "emerald" : "muted"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                </td>
                <td className="space-x-3 px-4 py-3">
                  <button type="button" onClick={() => startEdit(s)} className="text-emerald-700 hover:underline">
                    Edit
                  </button>
                  <button type="button" onClick={() => toggleActive(s)} className="text-ink-soft hover:underline">
                    {s.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button type="button" onClick={() => remove(s)} className="text-red-700 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {scales.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No grade bands configured yet — results won&apos;t show a grade until you add some.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
