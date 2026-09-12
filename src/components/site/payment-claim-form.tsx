"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Label, Input, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/site/honeypot-field";

type Errors = Record<string, string>;

export function PaymentClaimForm({ defaultApplicationNumber = "" }: { defaultApplicationNumber?: string }) {
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const form = new FormData(e.currentTarget);
    const payload = {
      applicationNumber: String(form.get("applicationNumber") ?? ""),
      guardianPhone: String(form.get("guardianPhone") ?? ""),
      payerName: String(form.get("payerName") ?? ""),
      payerPhone: String(form.get("payerPhone") ?? ""),
      network: String(form.get("network") ?? ""),
      amount: String(form.get("amount") ?? ""),
      reference: String(form.get("reference") ?? ""),
      paidAt: String(form.get("paidAt") ?? ""),
      screenshotUrl: String(form.get("screenshotUrl") ?? ""),
      website: String(form.get("website") ?? ""),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/admissions/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not submit your payment details.");
        return;
      }
      setSuccess(true);
      toast.success("Payment details submitted for verification.");
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <p className="rounded-md bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
        Your payment details were submitted. An administrator will verify it — you can check progress on the
        Status page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <HoneypotField />
      <div>
        <Label htmlFor="applicationNumber">Application number</Label>
        <Input id="applicationNumber" name="applicationNumber" required defaultValue={defaultApplicationNumber} />
        {errors.applicationNumber && <FieldError>{errors.applicationNumber}</FieldError>}
      </div>
      <div>
        <Label htmlFor="guardianPhone">Guardian phone number on the application</Label>
        <Input id="guardianPhone" name="guardianPhone" type="tel" required />
        {errors.guardianPhone && <FieldError>{errors.guardianPhone}</FieldError>}
        <p className="mt-1 text-xs text-ink-soft">Used to confirm this is your application — must match what you entered when applying.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="payerName">Name on the payment</Label>
          <Input id="payerName" name="payerName" required />
          {errors.payerName && <FieldError>{errors.payerName}</FieldError>}
        </div>
        <div>
          <Label htmlFor="payerPhone">Phone used to pay</Label>
          <Input id="payerPhone" name="payerPhone" type="tel" required />
          {errors.payerPhone && <FieldError>{errors.payerPhone}</FieldError>}
        </div>
        <div>
          <Label htmlFor="network">Network</Label>
          <Input id="network" name="network" placeholder="MTN, Telecel, AirtelTigo…" />
        </div>
        <div>
          <Label htmlFor="amount">Amount paid (GHS)</Label>
          <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
          {errors.amount && <FieldError>{errors.amount}</FieldError>}
        </div>
        <div>
          <Label htmlFor="reference">Transaction / reference number</Label>
          <Input id="reference" name="reference" required />
          {errors.reference && <FieldError>{errors.reference}</FieldError>}
        </div>
        <div>
          <Label htmlFor="paidAt">Date paid</Label>
          <Input id="paidAt" name="paidAt" type="date" required />
          {errors.paidAt && <FieldError>{errors.paidAt}</FieldError>}
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="screenshotUrl">Screenshot link (optional)</Label>
          <Input id="screenshotUrl" name="screenshotUrl" placeholder="Paste a Google Drive / photo link" />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Submitting…" : "Submit Payment Details"}
      </Button>
    </form>
  );
}
