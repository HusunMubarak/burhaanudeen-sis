"use client";

import { useMemo, useState } from "react";
import { Label, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const REPORT_TYPES = [
  { id: "daily", label: "Daily" },
  { id: "monthly", label: "Monthly" },
  { id: "term", label: "Term" },
  { id: "student", label: "By Student" },
  { id: "class", label: "By Class" },
] as const;

type ClassOption = { id: string; name: string };
type TermOption = { id: string; name: string };
type StudentOption = { id: string; name: string };

export function AttendanceReportPanel({
  classes,
  terms,
  students,
}: {
  classes: ClassOption[];
  terms: TermOption[];
  students: StudentOption[];
}) {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]["id"]>("daily");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [termId, setTermId] = useState(terms[0]?.id ?? "");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");

  const href = useMemo(() => {
    const params = new URLSearchParams({ type });
    if (type === "daily") params.set("date", date);
    if (type === "monthly") params.set("month", month);
    if (type === "term" && termId) params.set("termId", termId);
    if (type === "class" && classId) params.set("classId", classId);
    if (type === "student" && studentId) params.set("studentId", studentId);
    return `/api/admin/reports/attendance?${params.toString()}`;
  }, [type, date, month, termId, classId, studentId]);

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="attendance-report-type">Report</Label>
            <Select id="attendance-report-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>

          {type === "daily" && (
            <div>
              <Label htmlFor="attendance-report-date">Date</Label>
              <Input id="attendance-report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          )}
          {type === "monthly" && (
            <div>
              <Label htmlFor="attendance-report-month">Month</Label>
              <Input id="attendance-report-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          )}
          {type === "term" && (
            <div>
              <Label htmlFor="attendance-report-term">Term</Label>
              <Select id="attendance-report-term" value={termId} onChange={(e) => setTermId(e.target.value)}>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {type === "class" && (
            <div>
              <Label htmlFor="attendance-report-class">Class</Label>
              <Select id="attendance-report-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {type === "student" && (
            <div>
              <Label htmlFor="attendance-report-student">Student</Label>
              <Select id="attendance-report-student" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <a href={`${href}&format=pdf`} target="_blank" rel="noreferrer">
            <Button type="button" variant="outline">
              PDF / Print
            </Button>
          </a>
          <a href={`${href}&format=xlsx`}>
            <Button type="button" variant="outline">
              Excel
            </Button>
          </a>
          <a href={`${href}&format=csv`}>
            <Button type="button" variant="outline">
              CSV
            </Button>
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
