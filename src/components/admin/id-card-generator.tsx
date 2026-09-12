"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ClassOption = { id: string; name: string };
type StudentOption = { id: string; name: string; admissionNumber: string; classId: string | null };

export function IdCardGenerator({ classes, students }: { classes: ClassOption[]; students: StudentOption[] }) {
  const [classFilter, setClassFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const visible = useMemo(
    () => (classFilter === "all" ? students : students.filter((s) => s.classId === classFilter)),
    [students, classFilter]
  );

  const allVisibleSelected = visible.length > 0 && visible.every((s) => selected.has(s.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visible.forEach((s) => next.delete(s.id));
      else visible.forEach((s) => next.add(s.id));
      return next;
    });
  }

  async function generate() {
    if (selected.size === 0) {
      toast.error("Select at least one student.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/students/id-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error ?? "Could not generate ID cards.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "student-id-cards.pdf";
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Generated ${selected.size} ID card(s).`);
    } catch {
      toast.error("Network error.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-6">
          <div>
            <Label htmlFor="id-card-class">Class</Label>
            <Select id="id-card-class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="all">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" variant="outline" onClick={toggleAllVisible}>
            {allVisibleSelected ? "Deselect all" : "Select all"}
          </Button>
          <Button type="button" onClick={generate} disabled={generating || selected.size === 0}>
            {generating ? "Generating…" : `Generate ${selected.size} ID Card(s)`}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="w-10 px-4 py-3"></th>
              <th className="px-4 py-3">Admission No.</th>
              <th className="px-4 py-3">Name</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                </td>
                <td className="px-4 py-3 text-ink-soft">{s.admissionNumber}</td>
                <td className="px-4 py-3 font-medium text-ink">{s.name}</td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-ink-soft">
                  No students in this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
