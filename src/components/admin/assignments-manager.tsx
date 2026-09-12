"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/card";

type ClassLite = { id: string; name: string };
type SubjectLite = { id: string; name: string; code: string };
type StaffLite = { id: string; user: { name: string } };
type TeacherAssignment = { teacherSubjectId: string; staff: StaffLite };
type AssignmentRow = {
  id: string;
  class: ClassLite;
  subject: SubjectLite;
  assessmentCount: number;
  teachers: TeacherAssignment[];
};

export function AssignmentsManager({
  classes,
  subjects,
  teachers,
  initialAssignments,
}: {
  classes: ClassLite[];
  subjects: SubjectLite[];
  teachers: StaffLite[];
  initialAssignments: AssignmentRow[];
}) {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [teacherPicks, setTeacherPicks] = useState<Record<string, string>>({});

  async function refresh() {
    const res = await fetch("/api/admin/class-subjects");
    if (res.ok) setAssignments(await res.json());
  }

  async function assignSubjectToClass() {
    if (!classId || !subjectId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/class-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, subjectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not assign subject.");
        return;
      }
      toast.success("Subject assigned to class.");
      setSubjectId("");
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function unassign(row: AssignmentRow) {
    if (!confirm(`Remove ${row.subject.name} from ${row.class.name}?`)) return;
    const res = await fetch(`/api/admin/class-subjects/${row.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error ?? "Could not unassign subject.");
      return;
    }
    toast.success("Subject unassigned.");
    await refresh();
  }

  async function assignTeacher(row: AssignmentRow) {
    const staffId = teacherPicks[row.id];
    if (!staffId) return;
    const res = await fetch("/api/admin/teacher-subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, classSubjectId: row.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data?.error ?? "Could not assign teacher.");
      return;
    }
    toast.success("Teacher assigned.");
    setTeacherPicks((p) => ({ ...p, [row.id]: "" }));
    await refresh();
  }

  async function removeTeacher(teacherSubjectId: string) {
    const res = await fetch(`/api/admin/teacher-subjects/${teacherSubjectId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Teacher removed.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">Assign a Subject to a Class</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="aclass">Class</Label>
              <Select id="aclass" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="asubject">Subject</Label>
              <Select id="asubject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={assignSubjectToClass} disabled={saving || !classId || !subjectId}>
                Assign
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {assignments.map((row) => (
          <Card key={row.id}>
            <CardContent className="space-y-3 py-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-display text-base font-semibold text-ink">
                    {row.subject.name} <span className="text-ink-soft">({row.subject.code})</span> — {row.class.name}
                  </p>
                  {row.assessmentCount > 0 && (
                    <Badge tone="muted">{row.assessmentCount} assessment(s) recorded</Badge>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => unassign(row)}
                  disabled={row.assessmentCount > 0}
                  className="text-sm text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                  title={row.assessmentCount > 0 ? "Has assessments — can't unassign" : undefined}
                >
                  Unassign
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {row.teachers.map((t) => (
                  <span
                    key={t.teacherSubjectId}
                    className="inline-flex items-center gap-2 rounded-full bg-paper-dim px-3 py-1 text-xs text-ink"
                  >
                    {t.staff.user.name}
                    <button
                      type="button"
                      onClick={() => removeTeacher(t.teacherSubjectId)}
                      className="text-red-700 hover:underline"
                      aria-label={`Remove ${t.staff.user.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {row.teachers.length === 0 && <span className="text-xs text-ink-soft">No teacher assigned yet.</span>}
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={teacherPicks[row.id] ?? ""}
                  onChange={(e) => setTeacherPicks((p) => ({ ...p, [row.id]: e.target.value }))}
                  className="max-w-xs"
                >
                  <option value="">Assign a teacher…</option>
                  {teachers
                    .filter((t) => !row.teachers.some((rt) => rt.staff.id === t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.user.name}
                      </option>
                    ))}
                </Select>
                <Button type="button" size="sm" variant="outline" onClick={() => assignTeacher(row)} disabled={!teacherPicks[row.id]}>
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {assignments.length === 0 && (
          <p className="rounded-xl border border-dashed border-line bg-white/50 px-6 py-10 text-center text-sm text-ink-soft">
            No subjects assigned to any class yet — use the form above.
          </p>
        )}
      </div>
    </div>
  );
}
