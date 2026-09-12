"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ClassLite = { id: string; name: string };
type TermLite = { id: string; name: string; isCurrent: boolean };
type YearLite = { id: string; name: string; isCurrent: boolean };
type Row = { classId: string; className: string; subjectId: string; subjectName: string; studentCount: number; averageScore: number };

export function AcademicPerformanceReport({
  classes,
  terms,
  academicYears,
}: {
  classes: ClassLite[];
  terms: TermLite[];
  academicYears: YearLite[];
}) {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState(terms.find((t) => t.isCurrent)?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(academicYears.find((y) => y.isCurrent)?.id ?? "");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (!termId || !academicYearId) {
      toast.error("Select a term and academic year.");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ termId, academicYearId });
      if (classId) params.set("classId", classId);
      const res = await fetch(`/api/admin/reports/academic-performance?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load report.");
        return;
      }
      setRows(data);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 py-6">
          <div>
            <Label htmlFor="pfclass">Class (optional)</Label>
            <Select id="pfclass" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="pfterm">Term</Label>
            <Select id="pfterm" value={termId} onChange={(e) => setTermId(e.target.value)} className="w-44">
              <option value="">Select…</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="pfyear">Academic Year</Label>
            <Select id="pfyear" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="w-44">
              <option value="">Select…</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="button" onClick={run} disabled={loading}>
            {loading ? "Loading…" : "View Report"}
          </Button>
        </CardContent>
      </Card>

      {rows && (
        <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Subject</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Average Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.classId}-${r.subjectId}`} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">{r.className}</td>
                  <td className="px-4 py-3">{r.subjectName}</td>
                  <td className="px-4 py-3">{r.studentCount}</td>
                  <td className="px-4 py-3">{r.averageScore.toFixed(1)}%</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                    No results recorded for this term yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
