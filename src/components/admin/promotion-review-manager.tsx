"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Badge } from "@/components/ui/card";

type Decision = "PROMOTE" | "RETAIN" | "GRADUATE" | "TRANSFER" | "WITHDRAW";
type ClassLite = { id: string; name: string };
type RecordRow = {
  id: string;
  student: { id: string; firstName: string; lastName: string; admissionNumber: string };
  decision: Decision;
  toClassId: string | null;
  toClassName: string | null;
  note: string;
};

const DECISIONS: Decision[] = ["PROMOTE", "RETAIN", "GRADUATE", "TRANSFER", "WITHDRAW"];
const NEEDS_DESTINATION: Decision[] = ["PROMOTE", "RETAIN", "TRANSFER"];

export function PromotionReviewManager({
  batchId,
  status,
  destinationClasses,
  initialRecords,
}: {
  batchId: string;
  status: "DRAFT" | "CONFIRMED";
  destinationClasses: ClassLite[];
  initialRecords: RecordRow[];
}) {
  const router = useRouter();
  const [records, setRecords] = useState(initialRecords);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const isDraft = status === "DRAFT";

  async function updateRecord(record: RecordRow, decision: Decision, toClassId: string | null) {
    setSavingId(record.id);
    try {
      const res = await fetch(`/api/admin/promotions/${batchId}/records/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, toClassId, note: record.note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update decision.");
        return;
      }
      setRecords((rs) =>
        rs.map((r) =>
          r.id === record.id
            ? {
                ...r,
                decision,
                toClassId: data.toClassId,
                toClassName: destinationClasses.find((c) => c.id === data.toClassId)?.name ?? null,
              }
            : r
        )
      );
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingId(null);
    }
  }

  async function confirmBatch() {
    if (!confirm("Confirm this promotion batch? Students will be moved and this can't be undone.")) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/admin/promotions/${batchId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not confirm promotion.");
        return;
      }
      toast.success(`Promoted ${data.promoted} student(s).`);
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setConfirming(false);
    }
  }

  const readyCount = records.filter((r) => !NEEDS_DESTINATION.includes(r.decision) || r.toClassId).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge tone={status === "CONFIRMED" ? "emerald" : "gold"}>{status}</Badge>
        {isDraft && (
          <Button type="button" onClick={confirmBatch} disabled={confirming || readyCount !== records.length}>
            {confirming ? "Confirming…" : "Confirm Promotion"}
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto py-4">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Adm. No.</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Destination Class</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-ink">
                    {r.student.firstName} {r.student.lastName}
                  </td>
                  <td className="px-4 py-3">{r.student.admissionNumber}</td>
                  <td className="px-4 py-3">
                    {isDraft ? (
                      <Select
                        value={r.decision}
                        disabled={savingId === r.id}
                        onChange={(e) =>
                          updateRecord(
                            r,
                            e.target.value as Decision,
                            NEEDS_DESTINATION.includes(e.target.value as Decision) ? r.toClassId : null
                          )
                        }
                        className="w-40"
                      >
                        {DECISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      r.decision
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {NEEDS_DESTINATION.includes(r.decision) ? (
                      isDraft ? (
                        <Select
                          value={r.toClassId ?? ""}
                          disabled={savingId === r.id}
                          onChange={(e) => updateRecord(r, r.decision, e.target.value || null)}
                          className="w-40"
                        >
                          <option value="">Select…</option>
                          {destinationClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        r.toClassName ?? "—"
                      )
                    ) : (
                      <span className="text-ink-soft">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-ink-soft">
                    No students in this batch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
