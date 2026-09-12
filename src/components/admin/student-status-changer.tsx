"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Select, Textarea, Label } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { STUDENT_STATUS_LABELS, STUDENT_STATUSES, canTransitionStudent, type StudentStatus } from "@/lib/students";

export function StudentStatusChanger({ studentId, currentStatus }: { studentId: string; currentStatus: StudentStatus }) {
  const router = useRouter();
  const allowedTargets = STUDENT_STATUSES.filter((s) => canTransitionStudent(currentStatus, s));
  const [status, setStatus] = useState<StudentStatus>(allowedTargets[0] ?? currentStatus);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function apply() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not change status.");
        return;
      }
      toast.success("Status updated.");
      setNote("");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (allowedTargets.length === 0) {
    return <p className="text-sm text-ink-soft">This status is final — no further changes are possible.</p>;
  }

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="status">New status</Label>
        <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as StudentStatus)}>
          {allowedTargets.map((s) => (
            <option key={s} value={s}>
              {STUDENT_STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
      </div>
      <Button type="button" onClick={apply} disabled={saving} size="sm">
        {saving ? "Updating…" : "Change Status"}
      </Button>
    </div>
  );
}
