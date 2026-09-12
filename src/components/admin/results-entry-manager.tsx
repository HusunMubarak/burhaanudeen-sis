"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type RosterEntry = {
  student: { id: string; firstName: string; lastName: string; admissionNumber: string };
  score: number | null;
  remark: string;
};

export function ResultsEntryManager({
  assessmentId,
  maxScore,
  roster: initialRoster,
}: {
  assessmentId: string;
  maxScore: number;
  roster: RosterEntry[];
}) {
  const [roster, setRoster] = useState(initialRoster);
  const [saving, setSaving] = useState(false);

  function setScore(studentId: string, score: string) {
    setRoster((r) =>
      r.map((e) => (e.student.id === studentId ? { ...e, score: score === "" ? null : Number(score) } : e))
    );
  }

  function setRemark(studentId: string, remark: string) {
    setRoster((r) => r.map((e) => (e.student.id === studentId ? { ...e, remark } : e)));
  }

  async function save() {
    const entries = roster
      .filter((e) => e.score !== null && !Number.isNaN(e.score))
      .map((e) => ({ studentId: e.student.id, score: e.score, remark: e.remark }));
    if (entries.length === 0) {
      toast.error("Enter at least one score.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/assessments/${assessmentId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save results.");
        return;
      }
      toast.success(`Saved ${data.count} score(s).`);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Adm. No.</th>
                <th className="px-4 py-3">Score (/{maxScore})</th>
                <th className="px-4 py-3">Remark</th>
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
                    <input
                      type="number"
                      min={0}
                      max={maxScore}
                      value={entry.score ?? ""}
                      onChange={(e) => setScore(entry.student.id, e.target.value)}
                      className="w-24 rounded-md border border-line px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={entry.remark}
                      onChange={(e) => setRemark(entry.student.id, e.target.value)}
                      className="w-full rounded-md border border-line px-2 py-1 text-sm"
                    />
                  </td>
                </tr>
              ))}
              {roster.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                    No active students in this class.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Button type="button" onClick={save} disabled={saving || roster.length === 0}>
          {saving ? "Saving…" : "Save Scores"}
        </Button>
      </CardContent>
    </Card>
  );
}
