"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Label, Input, Select, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/card";

type ClassSubjectOption = { id: string; label: string };
type TermLite = { id: string; name: string; isCurrent: boolean };
type YearLite = { id: string; name: string; isCurrent: boolean };
type AssessmentRow = {
  id: string;
  name: string;
  type: string;
  date: string;
  maxScore: number;
  weight: number;
  resultCount: number;
  className: string;
  subjectName: string;
  termName: string;
};

const COMMON_TYPES = ["Class Test", "Quiz", "Homework", "Mid-Term", "End of Term Exam", "Project"];

function emptyForm(terms: TermLite[], years: YearLite[]) {
  return {
    name: "",
    type: "Class Test",
    classSubjectId: "",
    termId: terms.find((t) => t.isCurrent)?.id ?? "",
    academicYearId: years.find((y) => y.isCurrent)?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    maxScore: "100",
    weight: "100",
  };
}

export function AssessmentsManager({
  classSubjects,
  terms,
  academicYears,
  initialAssessments,
}: {
  classSubjects: ClassSubjectOption[];
  terms: TermLite[];
  academicYears: YearLite[];
  initialAssessments: AssessmentRow[];
}) {
  const [assessments, setAssessments] = useState(initialAssessments);
  const [form, setForm] = useState(emptyForm(terms, academicYears));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function refresh() {
    const res = await fetch("/api/admin/assessments");
    if (res.ok) {
      const data = await res.json();
      setAssessments(
        data.map((a: {
          id: string; name: string; type: string; date: string; maxScore: string | number; weight: string | number;
          _count: { results: number };
          classSubject: { class: { name: string }; subject: { name: string } };
          term: { name: string };
        }) => ({
          id: a.id,
          name: a.name,
          type: a.type,
          date: a.date,
          maxScore: Number(a.maxScore),
          weight: Number(a.weight),
          resultCount: a._count.results,
          className: a.classSubject.class.name,
          subjectName: a.classSubject.subject.name,
          termName: a.term.name,
        }))
      );
    }
  }

  async function handleSubmit() {
    setErrors({});
    setSaving(true);
    try {
      const res = await fetch("/api/admin/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not create assessment.");
        return;
      }
      toast.success("Assessment created.");
      setForm(emptyForm(terms, academicYears));
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
          <p className="font-display text-lg font-semibold text-ink">New Assessment</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="ecs">Class &amp; Subject</Label>
              <Select id="ecs" value={form.classSubjectId} onChange={(e) => setForm({ ...form, classSubjectId: e.target.value })}>
                <option value="">Select…</option>
                {classSubjects.map((cs) => (
                  <option key={cs.id} value={cs.id}>
                    {cs.label}
                  </option>
                ))}
              </Select>
              {errors.classSubjectId && <FieldError>{errors.classSubjectId}</FieldError>}
            </div>
            <div>
              <Label htmlFor="ename">Name</Label>
              <Input id="ename" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mid-Term Test" />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </div>
            <div>
              <Label htmlFor="etype">Type</Label>
              <Input id="etype" list="assessment-types" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
              <datalist id="assessment-types">
                {COMMON_TYPES.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <Label htmlFor="eterm">Term</Label>
              <Select id="eterm" value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })}>
                <option value="">Select…</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="eyear">Academic Year</Label>
              <Select id="eyear" value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>
                <option value="">Select…</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="edate">Date</Label>
              <Input id="edate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="emax">Max Score</Label>
              <Input id="emax" type="number" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="eweight">Weight (%) toward term score</Label>
              <Input id="eweight" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </div>
          </div>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !form.classSubjectId || !form.name || !form.termId || !form.academicYearId}
          >
            {saving ? "Creating…" : "Create Assessment"}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Class / Subject</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Term</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Results</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {assessments.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{a.name}</td>
                <td className="px-4 py-3">
                  {a.subjectName} — {a.className}
                </td>
                <td className="px-4 py-3">{a.type}</td>
                <td className="px-4 py-3">{a.termName}</td>
                <td className="px-4 py-3">{a.date.slice(0, 10)}</td>
                <td className="px-4 py-3">
                  <Badge tone={a.resultCount > 0 ? "emerald" : "muted"}>{a.resultCount}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/academics/assessments/${a.id}`} className="text-emerald-700 hover:underline">
                    Enter Scores
                  </Link>
                </td>
              </tr>
            ))}
            {assessments.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-ink-soft">
                  No assessments yet — create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
