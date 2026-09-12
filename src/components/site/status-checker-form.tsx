"use client";

import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { Label, Input, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Result = {
  applicationNumber: string;
  applicantName: string;
  levelAppliedFor: string;
  statusLabel: string;
};

export function StatusCheckerForm() {
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [lastPayload, setLastPayload] = useState<{ applicationNumber: string; guardianPhone: string } | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      applicationNumber: String(form.get("applicationNumber") ?? ""),
      guardianPhone: String(form.get("guardianPhone") ?? ""),
    };
    setLastPayload(payload);

    setSubmitting(true);
    try {
      const res = await fetch("/api/admissions/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not check status.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw() {
    if (!lastPayload) return;
    if (!confirm("Withdraw this application? This cannot be undone.")) return;

    setWithdrawing(true);
    try {
      const res = await fetch("/api/admissions/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lastPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not withdraw application.");
        return;
      }
      toast.success("Application withdrawn.");
      setResult((r) => (r ? { ...r, statusLabel: "Application withdrawn" } : r));
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setWithdrawing(false);
    }
  }

  const canWithdraw = result && !["Accepted", "Enrolled", "Rejected", "Application withdrawn"].includes(result.statusLabel);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <Label htmlFor="applicationNumber">Application number</Label>
          <Input id="applicationNumber" name="applicationNumber" required placeholder="BIS-2027-00125" />
        </div>
        <div>
          <Label htmlFor="guardianPhone">Guardian phone number used on the application</Label>
          <Input id="guardianPhone" name="guardianPhone" type="tel" required />
        </div>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          <Search className="h-4 w-4" /> {submitting ? "Checking…" : "Check Status"}
        </Button>
      </form>

      {result && (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-ink-soft">{result.applicantName} · {result.levelAppliedFor}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-emerald-900">{result.statusLabel}</p>
            {canWithdraw && (
              <Button type="button" variant="outline" size="sm" onClick={handleWithdraw} disabled={withdrawing} className="mt-4">
                {withdrawing ? "Withdrawing…" : "Withdraw Application"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
