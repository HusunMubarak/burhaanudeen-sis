"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/card";

type SubjectRow = {
  id: string;
  name: string;
  code: string;
  level: "CRECHE" | "PRIMARY" | "JHS" | null;
  isActive: boolean;
  classCount: number;
};

const EMPTY = { name: "", code: "", level: "" };

export function SubjectsManager({ initialSubjects }: { initialSubjects: SubjectRow[] }) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startEdit(s: SubjectRow) {
    setEditingId(s.id);
    setForm({ name: s.name, code: s.code, level: s.level ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
  }

  async function refresh() {
    const res = await fetch("/api/admin/subjects");
    if (res.ok) setSubjects(await res.json());
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/subjects/${editingId}` : "/api/admin/subjects";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, level: form.level || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save subject.");
        return;
      }
      toast.success(editingId ? "Subject updated." : "Subject added.");
      cancelEdit();
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(s: SubjectRow) {
    const res = await fetch(`/api/admin/subjects/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !s.isActive }),
    });
    if (res.ok) {
      toast.success(`${s.name} ${s.isActive ? "deactivated" : "activated"}.`);
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editingId ? "Edit Subject" : "Add Subject"}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="sname">Name</Label>
              <Input id="sname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div>
              <Label htmlFor="scode">Code</Label>
              <Input id="scode" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" />
              {errors.code && <FieldError>{errors.code}</FieldError>}
            </div>
            <div>
              <Label htmlFor="slevel">Section (optional)</Label>
              <Select id="slevel" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                <option value="">All sections</option>
                <option value="CRECHE">Creche</option>
                <option value="PRIMARY">Primary</option>
                <option value="JHS">JHS</option>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSubmit} disabled={saving || !form.name || !form.code}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Subject"}
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
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Classes</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
                <td className="px-4 py-3">{s.code}</td>
                <td className="px-4 py-3">{s.level ?? "All"}</td>
                <td className="px-4 py-3">{s.classCount}</td>
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
                </td>
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-soft">
                  No subjects yet — add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
