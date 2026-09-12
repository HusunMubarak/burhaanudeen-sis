"use client";

import { useMemo, useState } from "react";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const REPORT_TYPES = [
  { id: "applications", label: "All Applications" },
  { id: "pending-payments", label: "Pending Payments" },
  { id: "verified-payments", label: "Verified Payments" },
  { id: "accepted", label: "Accepted" },
  { id: "rejected", label: "Rejected" },
  { id: "enrolled", label: "Enrolled" },
] as const;

export function AdmissionsReportPanel() {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]["id"]>("applications");

  const href = useMemo(() => `/api/admin/reports/admissions?type=${type}`, [type]);

  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="admissions-report-type">Report</Label>
            <Select id="admissions-report-type" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              {REPORT_TYPES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
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
