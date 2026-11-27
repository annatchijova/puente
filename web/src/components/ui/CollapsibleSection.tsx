export default function CollapsibleSection({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-lg border border-border bg-surface text-sm"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-foreground">
        {summary}
      </summary>
      <div className="border-t border-border px-3 py-2">{children}</div>
    </details>
  );
}
