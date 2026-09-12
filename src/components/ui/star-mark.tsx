export function StarMark({ className = "", tone = "emerald" }: { className?: string; tone?: "emerald" | "gold" | "paper" }) {
  const stroke = tone === "gold" ? "var(--color-gold-500)" : tone === "paper" ? "var(--color-paper)" : "var(--color-emerald-700)";
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 2 L24.5 15.5 L38 20 L24.5 24.5 L20 38 L15.5 24.5 L2 20 L15.5 15.5 Z"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M20 9 L22.5 17.5 L31 20 L22.5 22.5 L20 31 L17.5 22.5 L9 20 L17.5 17.5 Z"
        fill={stroke}
        opacity="0.9"
      />
    </svg>
  );
}

export function StarDivider({ tone = "emerald" }: { tone?: "emerald" | "gold" | "paper" }) {
  const lineColor = tone === "gold" ? "bg-gold-500/40" : tone === "paper" ? "bg-paper/40" : "bg-emerald-700/30";
  return (
    <div className="star-divider" role="presentation">
      <span className={`h-px w-10 ${lineColor}`} />
      <StarMark className="h-4 w-4" tone={tone} />
      <span className={`h-px w-10 ${lineColor}`} />
    </div>
  );
}
