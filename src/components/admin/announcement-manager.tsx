"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Textarea, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Announcement = {
  id: string;
  title: string;
  body: string;
  category: string;
  isPublished: boolean;
  isPrivate: boolean;
  createdAt: string;
};

const CATEGORIES = ["General", "Academic", "Admissions", "Events", "Finance", "Holiday"];

const emptyForm = { id: "", title: "", body: "", category: "General", isPublished: false, isPrivate: false };

export function AnnouncementManager({ initial }: { initial: Announcement[] }) {
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const editing = form.id !== "";

  async function refresh() {
    const res = await fetch("/api/admin/announcements");
    if (res.ok) setItems(await res.json());
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and content are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/announcements/${form.id}` : "/api/admin/announcements", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          category: form.category,
          isPublished: form.isPublished,
          isPrivate: form.isPrivate,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save announcement.");
        return;
      }
      toast.success(editing ? "Announcement updated." : "Announcement created.");
      setForm(emptyForm);
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(a: Announcement) {
    const res = await fetch(`/api/admin/announcements/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !a.isPublished }),
    });
    if (res.ok) {
      toast.success(a.isPublished ? "Unpublished." : "Published.");
      await refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Announcement deleted.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editing ? "Edit Announcement" : "New Announcement"}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ann-title">Title</Label>
              <Input id="ann-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="ann-category">Category</Label>
              <Select id="ann-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="ann-body">Content</Label>
            <Textarea id="ann-body" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={form.isPrivate}
                onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
              />
              Private (staff/parent portals only — not the public site)
            </label>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Create Announcement"}
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
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">
                  {a.title}
                  {a.isPrivate && <span className="ml-2 text-xs text-ink-soft">(private)</span>}
                </td>
                <td className="px-4 py-3 text-ink-soft">{a.category}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => togglePublish(a)}
                    className={a.isPublished ? "text-emerald-700" : "text-ink-soft"}
                  >
                    {a.isPublished ? "Published" : "Draft"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-emerald-700 hover:underline"
                      onClick={() =>
                        setForm({
                          id: a.id,
                          title: a.title,
                          body: a.body,
                          category: a.category,
                          isPublished: a.isPublished,
                          isPrivate: a.isPrivate,
                        })
                      }
                    >
                      Edit
                    </button>
                    <button type="button" className="text-red-700 hover:underline" onClick={() => remove(a.id)}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink-soft">
                  No announcements yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
