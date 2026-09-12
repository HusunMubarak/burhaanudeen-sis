"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Option = { id: string; name: string };

export function AssignFeesForm({
  years,
  terms,
  classes,
}: {
  years: Option[];
  terms: (Option & { academicYearId: string })[];
  classes: Option[];
}) {
  const [academicYearId, setAcademicYearId] = useState(years[0]?.id ?? "");
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ studentsCount: number; structuresCount: number; assignmentsCreated: number } | null>(null);

  const relevantTerms = terms.filter((t) => t.academicYearId === academicYearId);

  async function submit() {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/finance/assign-fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, academicYearId, termId: termId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not assign fees.");
        return;
      }
      toast.success(`Assigned ${data.assignmentsCreated} fee line item(s).`);
      setResult(data);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div>
          <Label htmlFor="af-class">Class</Label>
          <Select id="af-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="af-year">Academic year</Label>
          <Select id="af-year" value={academicYearId} onChange={(e) => { setAcademicYearId(e.target.value); setTermId(""); }}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="af-term">Term (optional)</Label>
          <Select id="af-term" value={termId} onChange={(e) => setTermId(e.target.value)}>
            <option value="">Whole year</option>
            {relevantTerms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </div>
        <Button type="button" onClick={submit} disabled={saving || !classId || !academicYearId}>
          {saving ? "Assigning…" : "Assign Matching Fees"}
        </Button>

        {result && (
          <div className="rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
            Matched {result.structuresCount} fee structure(s) against {result.studentsCount} student(s) —{" "}
            {result.assignmentsCreated} new assignment(s) created.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
