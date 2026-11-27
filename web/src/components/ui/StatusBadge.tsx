export type SemanticLevel = "critical" | "warning" | "info" | "stable";

const levelClasses: Record<SemanticLevel, string> = {
  critical: "bg-critical-surface text-critical",
  warning: "bg-warning-surface text-warning",
  info: "bg-info-surface text-info",
  stable: "bg-stable-surface text-stable",
};

const dotClasses: Record<SemanticLevel, string> = {
  critical: "bg-critical",
  warning: "bg-warning",
  info: "bg-info",
  stable: "bg-stable",
};

/**
 * Severity is always carried by the text, never by color alone — the
 * `label` prop is required so a badge can't be reduced to a bare color dot.
 * The dot is decorative reinforcement, not the signal itself.
 */
export default function StatusBadge({
  level,
  label,
}: {
  level: SemanticLevel;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${levelClasses[level]}`}
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${dotClasses[level]}`} />
      {label}
    </span>
  );
}
