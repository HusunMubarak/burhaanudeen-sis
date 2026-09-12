"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Label, Input, Textarea, FieldError } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SchoolSettings } from "@prisma/client";

type Errors = Record<string, string>;

type SettingsClient = Omit<SchoolSettings, "admissionFormFee"> & { admissionFormFee: number };

export function SettingsForm({ initial }: { initial: SettingsClient }) {
  const [settings, setSettings] = useState<SettingsClient>(initial);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  function set<K extends keyof SettingsClient>(key: K, value: SettingsClient[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.fieldErrors) setErrors(data.fieldErrors);
        toast.error(data?.error ?? "Could not save settings.");
        return;
      }
      setSettings({ ...data, admissionFormFee: Number(data.admissionFormFee) });
      toast.success("Settings saved.");
    } catch {
      toast.error("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">School name</Label>
            <Input id="name" value={settings.name} onChange={(e) => set("name", e.target.value)} required />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </div>
          <div>
            <Label htmlFor="motto">Motto</Label>
            <Input id="motto" value={settings.motto} onChange={(e) => set("motto", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="description">Short description</Label>
            <Textarea
              id="description"
              value={settings.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="vision">Vision</Label>
            <Textarea id="vision" value={settings.vision} onChange={(e) => set("vision", e.target.value)} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mission">Mission</Label>
            <Textarea id="mission" value={settings.mission} onChange={(e) => set("mission", e.target.value)} rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="history">History</Label>
            <Textarea id="history" value={settings.history} onChange={(e) => set("history", e.target.value)} rows={4} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="coreValues">Core values (comma-separated)</Label>
            <Input
              id="coreValues"
              value={settings.coreValues}
              onChange={(e) => set("coreValues", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact & Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={settings.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="town">Town</Label>
            <Input id="town" value={settings.town} onChange={(e) => set("town", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="district">District</Label>
            <Input id="district" value={settings.district} onChange={(e) => set("district", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={settings.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="altPhone">Alternate phone</Label>
            <Input id="altPhone" value={settings.altPhone} onChange={(e) => set("altPhone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={settings.email} onChange={(e) => set("email", e.target.value)} />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </div>
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={settings.website} onChange={(e) => set("website", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="mapEmbedUrl">Map embed URL</Label>
            <Input
              id="mapEmbedUrl"
              value={settings.mapEmbedUrl}
              onChange={(e) => set("mapEmbedUrl", e.target.value)}
              placeholder="https://www.google.com/maps/embed?..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admissions & Payments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="admissionFormFee">Admission form fee (GHS)</Label>
            <Input
              id="admissionFormFee"
              type="number"
              min="0"
              step="0.01"
              value={String(settings.admissionFormFee)}
              onChange={(e) => set("admissionFormFee", Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="momoNetwork">MoMo network</Label>
            <Input id="momoNetwork" value={settings.momoNetwork} onChange={(e) => set("momoNetwork", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="momoNumber">MoMo number</Label>
            <Input id="momoNumber" value={settings.momoNumber} onChange={(e) => set("momoNumber", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="momoAccountName">MoMo account name</Label>
            <Input
              id="momoAccountName"
              value={settings.momoAccountName}
              onChange={(e) => set("momoAccountName", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-3">
          <div>
            <Label htmlFor="facebookUrl">Facebook</Label>
            <Input id="facebookUrl" value={settings.facebookUrl} onChange={(e) => set("facebookUrl", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="twitterUrl">Twitter / X</Label>
            <Input id="twitterUrl" value={settings.twitterUrl} onChange={(e) => set("twitterUrl", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="instagramUrl">Instagram</Label>
            <Input
              id="instagramUrl"
              value={settings.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </form>
  );
}
