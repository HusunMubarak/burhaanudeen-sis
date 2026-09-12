"use client";

import { useMemo, useState } from "react";
import { Label, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const REPORT_TYPES = [
  { id: "all", label: "All Students" },
  { id: "by-class", label: "Students by Class" },
  { id: "by-gender", label: "Students by Gender" },
  { id: "new-admissions", label: "New Admissions" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "graduates", label: "Graduates" },
] as const;

export function StudentsReportPanel() {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]["id"]>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const needsDateRange = type === "new-admissions";

  const href = useMemo(() => {
    const params = new URLSearchParams({ type });
    if (needsDateRange) {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    return `/api/admin/reports/students?${params.toString()}`;
  }, [type, from, to, needsDateRange]);

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="students-report-type">Report</Label>
            <Select id="students-report-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          {needsDateRange && (
            <>
              <div>
                <Label htmlFor="students-report-from">From</Label>
                <Input id="students-report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="students-report-to">To</Label>
                <Input id="students-report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
            </>
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
