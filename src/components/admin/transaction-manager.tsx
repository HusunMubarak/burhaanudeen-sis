"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Label, Input, Select, Textarea } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type CategoryOption = { id: string; name: string };
type TransactionRow = {
  id: string;
  date: string;
  amount: string;
  description: string;
  method: string;
  reference: string;
  category: { name: string };
};

function ghs(n: number) {
  return `GH₵${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function TransactionManager({
  apiBase,
  categories,
  initialTransactions,
  initialTotal,
  showReceiptUrl = false,
}: {
  apiBase: string;
  categories: CategoryOption[];
  initialTransactions: TransactionRow[];
  initialTotal: number;
  showReceiptUrl?: boolean;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [total, setTotal] = useState(initialTotal);
  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? "",
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    method: "CASH",
    reference: "",
    description: "",
    receiptUrl: "",
  });
  const [saving, setSaving] = useState(false);

  async function refresh() {
    const res = await fetch(apiBase);
    if (res.ok) {
      const data = await res.json();
      const rows = data.transactions ?? data.expenses;
      setTransactions(rows);
      setTotal(rows.reduce((sum: number, r: TransactionRow) => sum + Number(r.amount), 0));
    }
  }

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(apiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: form.categoryId,
          date: form.date,
          amount: form.amount,
          method: form.method,
          reference: form.reference,
          description: form.description,
          ...(showReceiptUrl ? { receiptUrl: form.receiptUrl } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error ?? "Could not save.");
        return;
      }
      toast.success("Recorded.");
      setForm((f) => ({ ...f, amount: "", reference: "", description: "", receiptUrl: "" }));
      await refresh();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tx-category">Category</Label>
              <Select id="tx-category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="tx-date">Date</Label>
              <Input id="tx-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tx-amount">Amount (GH₵)</Label>
              <Input id="tx-amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tx-method">Method</Label>
              <Select id="tx-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="CASH">Cash</option>
                <option value="MOMO">MoMo</option>
                <option value="BANK">Bank</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="tx-reference">Reference (optional)</Label>
              <Input id="tx-reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
            </div>
            {showReceiptUrl && (
              <div>
                <Label htmlFor="tx-receipt">Receipt link (optional)</Label>
                <Input id="tx-receipt" value={form.receiptUrl} onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })} placeholder="https://..." />
              </div>
            )}
            <div className="sm:col-span-2">
              <Label htmlFor="tx-description">Description (optional)</Label>
              <Textarea id="tx-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
          </div>
          <Button type="button" onClick={submit} disabled={saving || !form.amount || !form.categoryId}>
            {saving ? "Saving…" : "Record"}
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-line bg-white/70">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="text-sm text-ink-soft">{transactions.length} record{transactions.length === 1 ? "" : "s"} on this page</p>
          <p className="text-sm font-semibold text-ink">Total: {ghs(total)}</p>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase text-ink-soft">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Description</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">{new Date(t.date).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3">{t.category.name}</td>
                <td className="px-4 py-3 font-medium">{ghs(Number(t.amount))}</td>
                <td className="px-4 py-3">{t.method}</td>
                <td className="px-4 py-3 text-ink-soft">{t.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
