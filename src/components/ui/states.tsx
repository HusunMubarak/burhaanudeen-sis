import { StarMark } from "@/components/ui/star-mark";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-white/50 px-6 py-16 text-center">
      <StarMark className="mb-4 h-8 w-8" />
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-ink-soft">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ComingSoonState({ moduleLabel }: { moduleLabel: string }) {
  return (
    <EmptyState
      title={`${moduleLabel} — coming in the next module`}
      description="This part of the system is scheduled for a later build phase. The navigation, permissions and page shell are already in place, ready to be filled in."
    />
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-line bg-white/50 px-6 py-16 text-ink-soft" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-700 border-t-transparent" />
      <span className="text-sm">{label}…</span>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
      <h3 className="font-display text-lg font-semibold text-red-800">{title}</h3>
      <p className="mt-2 text-sm text-red-700">{description}</p>
    </div>
  );
}
