"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type StudentOption = { id: string; label: string };
type TermLite = { id: string; name: string; isCurrent: boolean };
type YearLite = { id: string; name: string; isCurrent: boolean };

export function ReportCardPicker({
  students,
  terms,
  academicYears,
}: {
  students: StudentOption[];
  terms: TermLite[];
  academicYears: YearLite[];
}) {
  const [studentId, setStudentId] = useState("");
  const [termId, setTermId] = useState(terms.find((t) => t.isCurrent)?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(academicYears.find((y) => y.isCurrent)?.id ?? "");
  const [notifying, setNotifying] = useState(false);

  const href = studentId && termId && academicYearId
    ? `/api/admin/students/${studentId}/report-card?termId=${termId}&academicYearId=${academicYearId}`
    : null;

  async function notifyGuardian() {
    if (!studentId || !termId || !academicYearId) return;
    setNotifying(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/notify-report-card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId, academicYearId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error ?? "Could not notify the guardian.");
        return;
      }
      toast.success(
        data.notified > 0
          ? `Notified ${data.notified} linked guardian(s).`
          : "This student has no parent portal account linked yet."
      );
    } catch {
      toast.error("Network error.");
    } finally {
      setNotifying(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="rstudent">Student</Label>
            <Select id="rstudent" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">Select a student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="rterm">Term</Label>
            <Select id="rterm" value={termId} onChange={(e) => setTermId(e.target.value)}>
              <option value="">Select a term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ryear">Academic Year</Label>
            <Select id="ryear" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
              <option value="">Select an academic year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        {href ? (
          <div className="flex flex-wrap gap-3">
            <a href={href} target="_blank" rel="noopener noreferrer">
              <Button type="button">Generate Report Card PDF</Button>
            </a>
            <Button type="button" variant="outline" onClick={notifyGuardian} disabled={notifying}>
              {notifying ? "Notifying…" : "Notify Guardian"}
            </Button>
          </div>
        ) : (
          <Button type="button" disabled>
            Generate Report Card PDF
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
