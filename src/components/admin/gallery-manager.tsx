"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type GalleryRow = { id: string; title: string; imageUrl: string; caption: string; category: string; isPublished: boolean };

const emptyForm = { id: "", title: "", imageUrl: "", caption: "", category: "General", isPublished: true };

export function GalleryManager({ initial }: { initial: GalleryRow[] }) {
  const [items, setItems] = useState(initial);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const editing = form.id !== "";

  async function refresh() {
    const res = await fetch("/api/admin/gallery");
    if (res.ok) setItems(await res.json());
  }

  async function save() {
    if (!form.title.trim() || !form.imageUrl.trim()) {
      toast.error("Title and image URL are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(editing ? `/api/admin/gallery/${form.id}` : "/api/admin/gallery", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          imageUrl: form.imageUrl,
          caption: form.caption,
          category: form.category,
          isPublished: form.isPublished,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save image.");
        return;
      }
      toast.success(editing ? "Image updated." : "Image added.");
      setForm(emptyForm);
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish(g: GalleryRow) {
    const res = await fetch(`/api/admin/gallery/${g.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !g.isPublished }),
    });
    if (res.ok) {
      toast.success(g.isPublished ? "Unpublished." : "Published.");
      await refresh();
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this image?")) return;
    const res = await fetch(`/api/admin/gallery/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Image removed.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">{editing ? "Edit Image" : "Add Image"}</p>
          <p className="text-xs text-ink-soft">
            Paste a link to an already-hosted, optimized image (e.g. a compressed JPEG on your image host). Direct
            upload isn&apos;t available yet — see the delivery notes for why.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="gal-title">Title</Label>
              <Input id="gal-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="gal-category">Category</Label>
              <Input id="gal-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="gal-url">Image URL</Label>
              <Input id="gal-url" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="gal-caption">Caption</Label>
              <Input id="gal-caption" value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />
            Published on the public site
          </label>
          <div className="flex gap-3">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : editing ? "Save Changes" : "Add Image"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" onClick={() => setForm(emptyForm)}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((g) => (
          <Card key={g.id}>
            {/* eslint-disable-next-line @next/next/no-img-element -- gallery images are arbitrary external URLs, not local/optimizable assets */}
            <img src={g.imageUrl} alt={g.title} className="h-36 w-full rounded-t-xl object-cover" />
            <CardContent className="space-y-2 py-4">
              <p className="font-medium text-ink">{g.title}</p>
              <p className="text-xs text-ink-soft">{g.category}</p>
              <div className="flex items-center justify-between text-sm">
                <button type="button" onClick={() => togglePublish(g)} className={g.isPublished ? "text-emerald-700" : "text-ink-soft"}>
                  {g.isPublished ? "Published" : "Draft"}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-emerald-700 hover:underline"
                    onClick={() =>
                      setForm({ id: g.id, title: g.title, imageUrl: g.imageUrl, caption: g.caption, category: g.category, isPublished: g.isPublished })
                    }
                  >
                    Edit
                  </button>
                  <button type="button" className="text-red-700 hover:underline" onClick={() => remove(g.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && <p className="text-sm text-ink-soft">No images yet.</p>}
      </div>
    </div>
  );
}
