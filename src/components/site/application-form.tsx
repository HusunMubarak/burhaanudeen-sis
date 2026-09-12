"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label, Input, Textarea, Select, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/site/honeypot-field";

type Errors = Record<string, string>;

const LEVELS = [
  "Creche",
  "KG 1",
  "KG 2",
  "Primary 1",
  "Primary 2",
  "Primary 3",
  "Primary 4",
  "Primary 5",
  "Primary 6",
  "JHS 1",
  "JHS 2",
  "JHS 3",
];

function sectionFor(level: string): "CRECHE" | "PRIMARY" | "JHS" {
  if (level === "Creche") return "CRECHE";
  if (level.startsWith("JHS")) return "JHS";
  return "PRIMARY";
}

export function ApplicationForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    const form = new FormData(e.currentTarget);
    const level = String(form.get("levelAppliedFor") ?? "");

    const payload = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      otherNames: String(form.get("otherNames") ?? ""),
      gender: String(form.get("gender") ?? ""),
      dateOfBirth: String(form.get("dateOfBirth") ?? ""),
      nationality: String(form.get("nationality") ?? "Ghanaian"),
      address: String(form.get("address") ?? ""),
      guardianName: String(form.get("guardianName") ?? ""),
      guardianPhone: String(form.get("guardianPhone") ?? ""),
      guardianEmail: String(form.get("guardianEmail") ?? ""),
      emergencyContactName: String(form.get("emergencyContactName") ?? ""),
      emergencyContactPhone: String(form.get("emergencyContactPhone") ?? ""),
      previousSchool: String(form.get("previousSchool") ?? ""),
      levelAppliedFor: level,
      section: sectionFor(level),
      website: String(form.get("website") ?? ""),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/admissions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not submit your application.");
        return;
      }
      toast.success(`Application submitted — your number is ${data.applicationNumber}`);
      router.push(`/admissions/apply/submitted?applicationNumber=${encodeURIComponent(data.applicationNumber)}`);
    } catch {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <HoneypotField />
      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold text-ink">Student Information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" name="firstName" required />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" name="lastName" required />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </div>
          <div>
            <Label htmlFor="otherNames">Other names (optional)</Label>
            <Input id="otherNames" name="otherNames" />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" name="gender" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
            {errors.gender && <FieldError>{errors.gender}</FieldError>}
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
            {errors.dateOfBirth && <FieldError>{errors.dateOfBirth}</FieldError>}
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" name="nationality" defaultValue="Ghanaian" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Home address</Label>
            <Textarea id="address" name="address" rows={2} />
          </div>
          <div>
            <Label htmlFor="levelAppliedFor">Level applying for</Label>
            <Select id="levelAppliedFor" name="levelAppliedFor" required defaultValue="">
              <option value="" disabled>
                Select
              </option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
            {errors.levelAppliedFor && <FieldError>{errors.levelAppliedFor}</FieldError>}
          </div>
          <div>
            <Label htmlFor="previousSchool">Previous school (if any)</Label>
            <Input id="previousSchool" name="previousSchool" />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-display text-lg font-semibold text-ink">Guardian Information</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="guardianName">Guardian full name</Label>
            <Input id="guardianName" name="guardianName" required />
            {errors.guardianName && <FieldError>{errors.guardianName}</FieldError>}
          </div>
          <div>
            <Label htmlFor="guardianPhone">Guardian phone</Label>
            <Input id="guardianPhone" name="guardianPhone" type="tel" required />
            <p className="mt-1 text-xs text-ink-soft">
              You&apos;ll need this exact number later to check your application status.
            </p>
            {errors.guardianPhone && <FieldError>{errors.guardianPhone}</FieldError>}
          </div>
          <div>
            <Label htmlFor="guardianEmail">Guardian email (optional)</Label>
            <Input id="guardianEmail" name="guardianEmail" type="email" />
          </div>
          <div>
            <Label htmlFor="emergencyContactName">Emergency contact name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" />
          </div>
        </div>
      </section>

      <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Submitting…" : "Submit Application"}
      </Button>
    </form>
  );
}
