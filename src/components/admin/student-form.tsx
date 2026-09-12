"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label, Input, Select, Textarea, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STUDENT_STATUS_LABELS } from "@/lib/students";

type ClassOption = { id: string; name: string };
type YearOption = { id: string; name: string };

type StudentInitial = {
  id?: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  gender: string;
  dateOfBirth: string; // yyyy-mm-dd
  nationality: string;
  address: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  previousSchool: string;
  classId: string;
  academicYearId: string;
  status: string;
};

const EMPTY: StudentInitial = {
  firstName: "",
  lastName: "",
  otherNames: "",
  gender: "Male",
  dateOfBirth: "",
  nationality: "Ghanaian",
  address: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  previousSchool: "",
  classId: "",
  academicYearId: "",
  status: "ACTIVE",
};

export function StudentForm({
  initial,
  classes,
  years,
}: {
  initial?: StudentInitial;
  classes: ClassOption[];
  years: YearOption[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<StudentInitial>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof StudentInitial>(key: K, value: StudentInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/students/${initial!.id}` : "/api/admin/students";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          classId: form.classId || null,
          academicYearId: form.academicYearId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save student.");
        return;
      }
      toast.success(isEdit ? "Student updated." : "Student added.");
      router.push(`/admin/students/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </div>
          <div>
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </div>
          <div>
            <Label htmlFor="otherNames">Other names</Label>
            <Input id="otherNames" value={form.otherNames} onChange={(e) => set("otherNames", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              required
            />
            {errors.dateOfBirth && <FieldError>{errors.dateOfBirth}</FieldError>}
          </div>
          <div>
            <Label htmlFor="nationality">Nationality</Label>
            <Input id="nationality" value={form.nationality} onChange={(e) => set("nationality", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} />
          </div>
          <div>
            <Label htmlFor="previousSchool">Previous school</Label>
            <Input id="previousSchool" value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardian & Emergency Contact</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="guardianName">Guardian name</Label>
            <Input id="guardianName" value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} required />
            {errors.guardianName && <FieldError>{errors.guardianName}</FieldError>}
          </div>
          <div>
            <Label htmlFor="guardianPhone">Guardian phone</Label>
            <Input id="guardianPhone" value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} required />
            {errors.guardianPhone && <FieldError>{errors.guardianPhone}</FieldError>}
          </div>
          <div>
            <Label htmlFor="guardianEmail">Guardian email</Label>
            <Input id="guardianEmail" type="email" value={form.guardianEmail} onChange={(e) => set("guardianEmail", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="emergencyContactName">Emergency contact name</Label>
            <Input
              id="emergencyContactName"
              value={form.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Emergency contact phone</Label>
            <Input
              id="emergencyContactPhone"
              value={form.emergencyContactPhone}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enrollment</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label htmlFor="classId">Class</Label>
            <Select id="classId" value={form.classId} onChange={(e) => set("classId", e.target.value)}>
              <option value="">Unassigned</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="academicYearId">Academic year</Label>
            <Select id="academicYearId" value={form.academicYearId} onChange={(e) => set("academicYearId", e.target.value)}>
              <option value="">Unassigned</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </Select>
          </div>
          {isEdit && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={form.status} disabled>
                {Object.entries(STUDENT_STATUS_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-ink-soft">Change status from the student profile page.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Student"}
        </Button>
      </div>
    </form>
  );
}
