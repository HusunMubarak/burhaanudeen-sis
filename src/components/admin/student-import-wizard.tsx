"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type PreviewRow = {
  rowNumber: number;
  raw: Record<string, unknown>;
  valid: boolean;
  errors: string[];
};

type Preview = { rows: PreviewRow[]; summary: { total: number; valid: number; invalid: number } };

export function StudentImportWizard() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePreview() {
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", "preview");
      const res = await fetch("/api/admin/students/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not read file.");
        return;
      }
      setPreview(data);
    } catch {
      toast.error("Network error while reading file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("action", "confirm");
      const res = await fetch("/api/admin/students/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Import failed.");
        return;
      }
      toast.success(`Imported ${data.created} student${data.created === 1 ? "" : "s"}.${data.failed ? ` ${data.failed} row(s) skipped.` : ""}`);
      router.push("/admin/students");
      router.refresh();
    } catch {
      toast.error("Network error during import.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <div>
            <Link href="/api/admin/students/import/template" className="text-sm font-medium text-emerald-700 hover:underline">
              Download the import template (CSV)
            </Link>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setPreview(null);
            }}
            className="block w-full text-sm text-ink-soft file:mr-4 file:rounded-md file:border-0 file:bg-emerald-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-paper hover:file:bg-emerald-900"
          />
          <Button type="button" onClick={handlePreview} disabled={!file || loading}>
            {loading ? "Reading…" : "Preview & Validate"}
          </Button>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardContent className="space-y-4 py-6">
            <p className="text-sm text-ink">
              <span className="font-medium">{preview.summary.total}</span> rows found —{" "}
              <span className="font-medium text-emerald-700">{preview.summary.valid} valid</span>,{" "}
              <span className="font-medium text-red-700">{preview.summary.invalid} with errors</span>.
            </p>

            <div className="max-h-96 overflow-auto rounded-md border border-line">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-paper-dim">
                  <tr className="text-left">
                    <th className="px-3 py-2">Row</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((r) => (
                    <tr key={r.rowNumber} className="border-t border-line">
                      <td className="px-3 py-2">{r.rowNumber}</td>
                      <td className="px-3 py-2">
                        {String(r.raw.firstName ?? "")} {String(r.raw.lastName ?? "")}
                      </td>
                      <td className="px-3 py-2">
                        {r.valid ? (
                          <span className="text-emerald-700">Valid</span>
                        ) : (
                          <span className="text-red-700">{r.errors.join("; ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button type="button" onClick={handleConfirm} disabled={loading || preview.summary.valid === 0}>
              {loading ? "Importing…" : `Import ${preview.summary.valid} Valid Row${preview.summary.valid === 1 ? "" : "s"}`}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
