"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label, Input, Select, Textarea, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RecordPaymentForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit() {
    setErrors({});
    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, amount, date, method, reference, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not record payment.");
        return;
      }
      toast.success("Payment recorded.");
      setAmount("");
      setReference("");
      setDescription("");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="amount">Amount (GH₵)</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            {errors.amount && <FieldError>{errors.amount}</FieldError>}
          </div>
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="method">Method</Label>
            <Select id="method" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option>
              <option value="MOMO">MoMo</option>
              <option value="BANK">Bank</option>
              <option value="OTHER">Other</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="reference">Reference (optional)</Label>
            <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
        </div>
        <Button type="button" onClick={submit} disabled={saving || !amount}>
          {saving ? "Recording…" : "Record Payment"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function ReversePaymentButton({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (reason.trim().length < 3) {
      toast.error("Explain why this payment is being reversed.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/finance/payments/${paymentId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not reverse payment.");
        return;
      }
      toast.success("Payment reversed.");
      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-red-700 hover:underline">
        Reverse
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-md border border-red-200 bg-red-50 p-3">
      <Textarea
        placeholder="Reason for reversal (required)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        className="text-xs"
      />
      <div className="flex gap-2">
        <Button type="button" variant="danger" size="sm" disabled={saving} onClick={submit}>
          {saving ? "Reversing…" : "Confirm Reversal"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
