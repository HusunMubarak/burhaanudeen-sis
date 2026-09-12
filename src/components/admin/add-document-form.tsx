"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

export function AddDocumentForm({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) {
      toast.error("Enter a document name.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, url }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not add document.");
        return;
      }
      toast.success("Document added.");
      setName("");
      setUrl("");
      router.refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3">
      <div className="flex-1 min-w-[140px]">
        <Input placeholder="Document name, e.g. Birth Certificate" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="flex-1 min-w-[140px]">
        <Input placeholder="Link (optional, e.g. Google Drive)" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <Button type="button" size="sm" onClick={submit} disabled={saving}>
        {saving ? "Adding…" : "Add"}
      </Button>
    </div>
  );
}
