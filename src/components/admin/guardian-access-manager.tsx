"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

type GuardianRow = { id: string; relationship: string; user: { name: string; email: string; isActive: boolean } };

export function GuardianAccessManager({ studentId, initial }: { studentId: string; initial: GuardianRow[] }) {
  const [guardians, setGuardians] = useState(initial);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [relationship, setRelationship] = useState("Parent/Guardian");
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/admin/students/${studentId}/guardians`);
    if (res.ok) setGuardians(await res.json());
  }

  async function link() {
    if (!email.trim()) {
      toast.error("Enter the parent's email address.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/guardians`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, email, name, password: mode === "new" ? password : undefined, relationship }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not link the parent account.");
        return;
      }
      toast.success("Parent portal access granted.");
      setEmail("");
      setName("");
      setPassword("");
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function unlink(guardianId: string) {
    if (!confirm("Remove this parent's access to this student's records?")) return;
    const res = await fetch(`/api/admin/students/${studentId}/guardians/${guardianId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Access removed.");
      await refresh();
    }
  }

  return (
    <div className="space-y-4">
      {guardians.length === 0 ? (
        <p className="text-sm text-ink-soft">No parent portal accounts linked yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {guardians.map((g) => (
            <li key={g.id} className="flex items-center justify-between border-b border-line pb-2 last:border-0">
              <div>
                <p className="font-medium text-ink">{g.user.name}</p>
                <p className="text-xs text-ink-soft">
                  {g.user.email} · {g.relationship}
                  {!g.user.isActive && " · inactive"}
                </p>
              </div>
              <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => unlink(g.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-line pt-4">
        <div className="flex gap-4 text-xs">
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} /> Existing account
          </label>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={mode === "new"} onChange={() => setMode("new")} /> Create new account
          </label>
        </div>
        <div>
          <Label htmlFor="guardian-email">Parent Email</Label>
          <Input id="guardian-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {mode === "new" && (
          <>
            <div>
              <Label htmlFor="guardian-name">Parent Name</Label>
              <Input id="guardian-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="guardian-password">Temporary Password</Label>
              <Input id="guardian-password" type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </>
        )}
        <div>
          <Label htmlFor="guardian-relationship">Relationship</Label>
          <Select id="guardian-relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            <option>Parent/Guardian</option>
            <option>Mother</option>
            <option>Father</option>
            <option>Grandparent</option>
            <option>Other Relative</option>
          </Select>
        </div>
        <Button type="button" onClick={link} disabled={saving} className="w-full">
          {saving ? "Linking…" : "Grant Parent Portal Access"}
        </Button>
      </div>
    </div>
  );
}
