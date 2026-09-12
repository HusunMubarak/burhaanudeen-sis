"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type EventRow = {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string | null;
  isPublished: boolean;
};

const emptyForm = { id: "", title: "", description: "", location: "", startsAt: "", endsAt: "", isPublished: false };

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

export function EventManager({ initial }: { initial: EventRow[] }) {
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const editing = form.id !== "";

  async function refresh() {
    const res = await fetch("/api/admin/events");
    if (res.ok) setItems(await res.json());
  }

  async function save() {
    if (!form.title.trim() || !form.startsAt) {
      toast.error("Title and start date/time are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/events/${form.id}` : "/api/admin/events", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          location: form.location,
          startsAt: new Date(form.startsAt).toISOString(),
          endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
          isPublished: form.isPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save event.");
        return;
      }
      toast.success(editing ? "Event updated." : "Event created.");
      setForm(emptyForm);
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(e: EventRow) {
    const res = await fetch(`/api/admin/events/${e.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !e.isPublished }),
    });
    if (res.ok) {
      toast.success(e.isPublished ? "Unpublished." : "Published.");
      await refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this event?")) return;
    const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Event deleted.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editing ? "Edit Event" : "New Event"}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ev-title">Title</Label>
              <Input id="ev-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ev-location">Location</Label>
              <Input id="ev-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ev-start">Starts</Label>
              <Input
                id="ev-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ev-end">Ends (optional)</Label>
              <Input
                id="ev-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => setForm({ ...form, endsAt: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ev-desc">Description</Label>
            <Textarea id="ev-desc" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Published on the public site
          </label>
          <div className="flex gap-3">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Event"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr key={e.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{e.title}</td>
                <td className="px-4 py-3 text-ink-soft">{new Date(e.startsAt).toLocaleString("en-GB")}</td>
                <td className="px-4 py-3 text-ink-soft">{e.location || "—"}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => togglePublish(e)} className={e.isPublished ? "text-emerald-700" : "text-ink-soft"}>
                    {e.isPublished ? "Published" : "Draft"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-emerald-700 hover:underline"
                      onClick={() =>
                        setForm({
                          id: e.id,
                          title: e.title,
                          description: e.description,
                          location: e.location,
                          startsAt: toLocalInput(e.startsAt),
                          endsAt: toLocalInput(e.endsAt),
                          isPublished: e.isPublished,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button type="button" className="text-red-700 hover:underline" onClick={() => remove(e.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-soft">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
