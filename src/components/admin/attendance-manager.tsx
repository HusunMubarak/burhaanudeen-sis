"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Select, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingState, EmptyState } from "@/components/ui/states";

type ClassLite = { id: string; name: string };
type TermLite = { id: string; name: string; isCurrent: boolean };
type YearLite = { id: string; name: string; isCurrent: boolean };
type Status = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

type RosterEntry = {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string };
  status: Status | null;
  note: string;
};

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
  { value: "EXCUSED", label: "Excused" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceManager({
  classes,
  terms,
  academicYears,
}: {
  classes: ClassLite[];
  terms: TermLite[];
  academicYears: YearLite[];
}) {
  const [tab, setTab] = useState<"mark" | "summary">("mark");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [date, setDate] = useState(todayISO());
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadRoster() {
    if (!classId || !date) return;
    setLoading(true);
    setRoster(null);
    try {
      const res = await fetch(`/api/admin/attendance?classId=${classId}&date=${date}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load roster.");
        return;
      }
      setRoster(data.roster);
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  }

  function setStatus(studentId: string, status: Status) {
    setRoster((r) => r?.map((e) => (e.student.id === studentId ? { ...e, status } : e)) ?? null);
  }

  function markAll(status: Status) {
    setRoster((r) => r?.map((e) => ({ ...e, status })) ?? null);
  }

  async function saveAttendance() {
    if (!roster) return;
    const entries = roster.filter((e) => e.status).map((e) => ({ studentId: e.student.id, status: e.status, note: e.note }));
    if (entries.length === 0) {
      toast.error("Mark at least one student.");
      return;
    }
    setSaving(true);
    try {
      const currentTerm = terms.find((t) => t.isCurrent)?.id;
      const currentYear = academicYears.find((y) => y.isCurrent)?.id;
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, date, termId: currentTerm, academicYearId: currentYear, entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save attendance.");
        return;
      }
      toast.success(`Attendance saved for ${data.count} student(s).`);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-line">
        <button
          type="button"
          onClick={() => setTab("mark")}
          className={`px-4 py-2 text-sm font-medium ${tab === "mark" ? "border-b-2 border-emerald-700 text-emerald-800" : "text-ink-soft"}`}
        >
          Mark Attendance
        </button>
        <button
          type="button"
          onClick={() => setTab("summary")}
          className={`px-4 py-2 text-sm font-medium ${tab === "summary" ? "border-b-2 border-emerald-700 text-emerald-800" : "text-ink-soft"}`}
        >
          Dashboard
        </button>
      </div>

      {tab === "mark" ? (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-end gap-4 py-6">
              <div>
                <Label htmlFor="mclass">Class</Label>
                <Select id="mclass" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
                  {classes.length === 0 && <option value="">No classes assigned</option>}
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="mdate">Date</Label>
                <Input id="mdate" type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="w-44" />
              </div>
              <Button type="button" onClick={loadRoster} disabled={!classId || loading}>
                {loading ? "Loading…" : "Load Roster"}
              </Button>
            </CardContent>
          </Card>

          {loading && <LoadingState label="Loading roster" />}

          {roster && roster.length === 0 && (
            <EmptyState title="No active students" description="This class has no active students to mark." />
          )}

          {roster && roster.length > 0 && (
            <Card>
              <CardContent className="space-y-4 py-4">
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-ink-soft">Quick mark:</span>
                  {STATUS_OPTIONS.map((o) => (
                    <button key={o.value} type="button" onClick={() => markAll(o.value)} className="text-sm text-emerald-700 hover:underline">
                      All {o.label}
                    </button>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Adm. No.</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map((entry) => (
                        <tr key={entry.student.id} className="border-b border-line last:border-0">
                          <td className="px-4 py-3 font-medium text-ink">
                            {entry.student.firstName} {entry.student.lastName}
                          </td>
                          <td className="px-4 py-3">{entry.student.admissionNumber}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-3">
                              {STATUS_OPTIONS.map((o) => (
                                <label key={o.value} className="flex items-center gap-1 text-xs">
                                  <input
                                    type="radio"
                                    name={`status-${entry.student.id}`}
                                    checked={entry.status === o.value}
                                    onChange={() => setStatus(entry.student.id, o.value)}
                                  />
                                  {o.label}
                                </label>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Button type="button" onClick={saveAttendance} disabled={saving}>
                  {saving ? "Saving…" : "Save Attendance"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <AttendanceSummary classes={classes} terms={terms} academicYears={academicYears} />
      )}
    </div>
  );
}

function AttendanceSummary({
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
  const [month, setMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: { present: number; absent: number; late: number; excused: number; total: number; percentage: number };
    byClass: { classId: string; className: string; percentage: number; total: number }[];
  } | null>(null);

  async function runQuery() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (termId) params.set("termId", termId);
      if (academicYearId) params.set("academicYearId", academicYearId);
      if (month) {
        const [y, m] = month.split("-");
        params.set("year", y);
        params.set("month", m);
      }
      const res = await fetch(`/api/admin/attendance/summary?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not load summary.");
        return;
      }
      setResult(data);
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
            <Label htmlFor="sclass">Class (optional)</Label>
            <Select id="sclass" value={classId} onChange={(e) => setClassId(e.target.value)} className="w-48">
              <option value="">All classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sterm">Term (optional)</Label>
            <Select id="sterm" value={termId} onChange={(e) => setTermId(e.target.value)} className="w-44">
              <option value="">Any term</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="syear">Academic Year (optional)</Label>
            <Select id="syear" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} className="w-44">
              <option value="">Any year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="smonth">Month (optional)</Label>
            <Input id="smonth" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          </div>
          <Button type="button" onClick={runQuery} disabled={loading}>
            {loading ? "Loading…" : "View"}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-5">
            {[
              ["Present", result.summary.present],
              ["Absent", result.summary.absent],
              ["Late", result.summary.late],
              ["Excused", result.summary.excused],
              ["Attendance rate", `${result.summary.percentage.toFixed(1)}%`],
            ].map(([label, value]) => (
              <Card key={label as string}>
                <CardContent className="py-5 text-center">
                  <p className="text-2xl font-semibold text-ink">{value}</p>
                  <p className="text-xs text-ink-soft">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.byClass.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Records</th>
                    <th className="px-4 py-3">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {result.byClass.map((c) => (
                    <tr key={c.classId} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-medium text-ink">{c.className}</td>
                      <td className="px-4 py-3">{c.total}</td>
                      <td className="px-4 py-3">{c.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
