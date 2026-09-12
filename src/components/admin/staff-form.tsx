"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label, Input, Select, Textarea, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, ROLE_NAMES, type RoleName } from "@/lib/rbac";

type StaffInitial = {
  id?: string;
  name: string;
  email: string;
  category: string;
  position: string;
  gender: string;
  phone: string;
  address: string;
  status: string;
  salaryNote: string;
  roles: RoleName[];
};

const EMPTY: StaffInitial = {
  name: "",
  email: "",
  category: "TEACHING",
  position: "",
  gender: "",
  phone: "",
  address: "",
  status: "ACTIVE",
  salaryNote: "",
  roles: ["TEACHER"],
};

export function StaffForm({ initial }: { initial?: StaffInitial }) {
  const router = useRouter();
  const [form, setForm] = useState<StaffInitial>(initial ?? EMPTY);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isEdit = Boolean(initial?.id);

  function set<K extends keyof StaffInitial>(key: K, value: StaffInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleRole(role: RoleName) {
    setForm((f) => ({
      ...f,
      roles: f.roles.includes(role) ? f.roles.filter((r) => r !== role) : [...f.roles, role],
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    if (form.roles.length === 0) {
      setErrors({ roles: "Select at least one system role" });
      return;
    }
    setSaving(true);
    try {
      const url = isEdit ? `/api/admin/staff/${initial!.id}` : "/api/admin/staff";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ...(password ? { password } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save staff member.");
        return;
      }
      toast.success(isEdit ? "Staff member updated." : "Staff member added.");
      router.push("/admin/staff");
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
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </div>
          <div>
            <Label htmlFor="password">{isEdit ? "New password (leave blank to keep current)" : "Password"}</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            {errors.password && <FieldError>{errors.password}</FieldError>}
          </div>
          <div>
            <Label htmlFor="position">Position / title</Label>
            <Input id="position" value={form.position} onChange={(e) => set("position", e.target.value)} required />
            {errors.position && <FieldError>{errors.position}</FieldError>}
          </div>
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" value={form.category} onChange={(e) => set("category", e.target.value)}>
              <option value="TEACHING">Teaching</option>
              <option value="NON_TEACHING">Non-Teaching</option>
              <option value="MANAGEMENT">Management</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          {isEdit && (
            <div>
              <Label htmlFor="status">Status</Label>
              <Select id="status" value={form.status} onChange={(e) => set("status", e.target.value)}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="RESIGNED">Resigned</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RETIRED">Retired</option>
              </Select>
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Access</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-ink-soft">Which parts of the admin dashboard can this person use?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ROLE_NAMES.filter((r) => r !== "SUPER_ADMIN").map((role) => (
              <label key={role} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.roles.includes(role)} onChange={() => toggleRole(role)} />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </div>
          {errors.roles && <FieldError>{errors.roles}</FieldError>}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Staff Member"}
        </Button>
      </div>
    </form>
  );
}
