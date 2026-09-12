"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CategoryRow = { id: string; name: string; isActive: boolean; description?: string };

export function CategoryManager({
  title,
  apiBase,
  initialCategories,
  withDescription = false,
}: {
  title: string;
  apiBase: string;
  initialCategories: CategoryRow[];
  withDescription?: boolean;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch(apiBase);
    if (res.ok) setCategories(await res.json());
  }

  async function addCategory() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ...(withDescription ? { description } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not add category.");
        return;
      }
      toast.success("Category added.");
      setName("");
      setDescription("");
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c: CategoryRow) {
    const res = await fetch(`${apiBase}/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    });
    if (res.ok) {
      toast.success(c.isActive ? "Category deactivated." : "Category activated.");
      await refresh();
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <p className="font-display text-lg font-semibold text-ink">Add {title} Category</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {withDescription && (
              <div>
                <Label htmlFor="cat-desc">Description (optional)</Label>
                <Input id="cat-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
            )}
          </div>
          <Button type="button" onClick={addCategory} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : "Add Category"}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                <td className="px-4 py-3">
                  <button type="button" onClick={() => toggleActive(c)} className={c.isActive ? "text-emerald-700" : "text-ink-soft"}>
                    {c.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
