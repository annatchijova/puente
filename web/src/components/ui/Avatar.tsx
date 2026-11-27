const HONORIFICS = new Set(["dr", "dr.", "dra", "dra."]);

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter((part) => !HONORIFICS.has(part.toLowerCase()));
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Circular initials badge — purely decorative identity marker, never the sole label for who someone is. */
export default function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info-surface text-sm font-semibold text-info"
    >
      {initials(name)}
    </span>
  );
}
