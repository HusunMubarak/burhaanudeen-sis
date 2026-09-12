"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Label, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/card";

type ClassLite = { id: string; name: string };
type YearLite = { id: string; name: string; isCurrent: boolean };
type BatchRow = { id: string; fromClassName: string; toYearName: string; status: "DRAFT" | "CONFIRMED"; recordCount: number };

export function PromotionsManager({
  classes,
  academicYears,
  initialBatches,
}: {
  classes: ClassLite[];
  academicYears: YearLite[];
  initialBatches: BatchRow[];
}) {
  const [batches, setBatches] = useState(initialBatches);
  const [fromClassId, setFromClassId] = useState("");
  const [toAcademicYearId, setToAcademicYearId] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch("/api/admin/promotions");
    if (res.ok) {
      const data = await res.json();
      setBatches(
        data.map((b: { id: string; fromClass: { name: string }; toAcademicYear: { name: string }; status: "DRAFT" | "CONFIRMED"; _count: { records: number } }) => ({
          id: b.id,
          fromClassName: b.fromClass.name,
          toYearName: b.toAcademicYear.name,
          status: b.status,
          recordCount: b._count.records,
        }))
      );
    }
  }

  async function prepare() {
    if (!fromClassId || !toAcademicYearId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromClassId, toAcademicYearId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not prepare promotion batch.");
        return;
      }
      toast.success("Promotion batch prepared — review it below.");
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
          <p className="font-display text-lg font-semibold text-ink">Prepare Promotion</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="pclass">From class</Label>
              <Select id="pclass" value={fromClassId} onChange={(e) => setFromClassId(e.target.value)}>
                <option value="">Select a class</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pyear">To academic year</Label>
              <Select id="pyear" value={toAcademicYearId} onChange={(e) => setToAcademicYearId(e.target.value)}>
                <option value="">Select a destination year</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="button" onClick={prepare} disabled={saving || !fromClassId || !toAcademicYearId}>
                {saving ? "Preparing…" : "Prepare Batch"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">From Class</th>
              <th className="px-4 py-3">To Year</th>
              <th className="px-4 py-3">Students</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{b.fromClassName}</td>
                <td className="px-4 py-3">{b.toYearName}</td>
                <td className="px-4 py-3">{b.recordCount}</td>
                <td className="px-4 py-3">
                  <Badge tone={b.status === "CONFIRMED" ? "emerald" : "gold"}>{b.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/academics/promotions/${b.id}`} className="text-emerald-700 hover:underline">
                    {b.status === "DRAFT" ? "Review" : "View"}
                  </Link>
                </td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-soft">
                  No promotion batches yet — prepare one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
