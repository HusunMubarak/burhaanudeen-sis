import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Section({
  children,
  className,
  tone = "paper",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "dim" | "emerald" | "night";
  id?: string;
}) {
  const toneClasses = {
    paper: "bg-paper",
    dim: "bg-paper-dim",
    emerald: "bg-emerald-900 text-paper",
    night: "bg-night text-paper",
  }[tone];
  return (
    <section id={id} className={cn("px-4 py-16 sm:px-6 sm:py-20", toneClasses, className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, tone = "emerald" }: { children: ReactNode; tone?: "emerald" | "gold" }) {
  const color = tone === "gold" ? "text-gold-500" : "text-emerald-700";
  return <p className={cn("font-mono-label text-xs font-medium uppercase", color)}>{children}</p>;
}
