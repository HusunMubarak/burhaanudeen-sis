"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ClassRow = {
  id: string;
  name: string;
  section: string;
  level: number;
  capacity: number;
  isActive: boolean;
  academicYearId: string;
  classTeacherId: string | null;
  academicYear: { id: string; name: string };
  classTeacher: { id: string; user: { name: string } } | null;
  _count: { students: number };
};

type Option = { id: string; name: string };

const emptyForm = (defaultYearId: string) => ({
  name: "",
  section: "PRIMARY",
  level: "0",
  capacity: "40",
  academicYearId: defaultYearId,
  classTeacherId: "",
});

export function ClassesManager({
  initialClasses,
  years,
  teachers,
}: {
  initialClasses: ClassRow[];
  years: Option[];
  teachers: Option[];
}) {
  const [classes, setClasses] = useState(initialClasses);
  const [form, setForm] = useState(emptyForm(years[0]?.id ?? ""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function startEdit(c: ClassRow) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      section: c.section,
      level: String(c.level),
      capacity: String(c.capacity),
      academicYearId: c.academicYearId,
      classTeacherId: c.classTeacherId ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(years[0]?.id ?? ""));
    setErrors({});
  }

  async function refresh() {
    const res = await fetch("/api/admin/classes");
    if (res.ok) setClasses(await res.json());
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const url = editingId ? `/api/admin/classes/${editingId}` : "/api/admin/classes";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          section: form.section,
          level: Number(form.level),
          capacity: Number(form.capacity),
          academicYearId: form.academicYearId,
          classTeacherId: form.classTeacherId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save class.");
        return;
      }
      toast.success(editingId ? "Class updated." : "Class added.");
      cancelEdit();
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: ClassRow) {
    const res = await fetch(`/api/admin/classes/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) {
      toast.success(c.isActive ? "Class deactivated." : "Class activated.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editingId ? "Edit Class" : "Add Class"}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="cname">Name</Label>
              <Input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Primary 3" />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div>
              <Label htmlFor="csection">Section</Label>
              <Select id="csection" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}>
                <option value="CRECHE">Creche</option>
                <option value="PRIMARY">Primary</option>
                <option value="JHS">JHS</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="clevel">Sort order</Label>
              <Input id="clevel" type="number" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ccapacity">Capacity</Label>
              <Input id="ccapacity" type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="cyear">Academic year</Label>
              <Select id="cyear" value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>
                {years.length === 0 && <option value="">No academic years yet</option>}
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
              {errors.academicYearId && <FieldError>{errors.academicYearId}</FieldError>}
            </div>
            <div>
              <Label htmlFor="cteacher">Class teacher</Label>
              <Select id="cteacher" value={form.classTeacherId} onChange={(e) => setForm({ ...form, classTeacherId: e.target.value })}>
                <option value="">Unassigned</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={handleSubmit} disabled={saving || !form.name || !form.academicYearId}>
              {saving ? "Saving…" : editingId ? "Save Changes" : "Add Class"}
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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Year</th>
              <th className="px-4 py-3">Teacher</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3">{c.section}</td>
                <td className="px-4 py-3">{c._count.students}</td>
                <td className="px-4 py-3">{c.capacity}</td>
                <td className="px-4 py-3">{c.academicYear.name}</td>
                <td className="px-4 py-3">{c.classTeacher?.user.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => toggleActive(c)} className={c.isActive ? "text-emerald-700" : "text-ink-soft"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => startEdit(c)} className="text-emerald-700 hover:underline">
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
