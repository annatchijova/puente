export type SemanticLevel = "critical" | "warning" | "info" | "stable";

const levelClasses: Record<SemanticLevel, string> = {
  critical: "bg-critical-surface text-critical",
  warning: "bg-warning-surface text-warning",
  info: "bg-info-surface text-info",
  stable: "bg-stable-surface text-stable",
};

/**
 * Severity is always carried by the text, never by color alone — the
 * `label` prop is required so a badge can't be reduced to a bare color dot.
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
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${levelClasses[level]}`}
    >
      {label}
    </span>
  );
}
