import Link from "next/link";
import Avatar from "./Avatar";

/**
 * Persistent header shell: wordmark, page-specific status chips in the
 * middle slot, and the signed-in identity on the right. Visual chrome
 * only — carries no authority logic of its own.
 */
export default function TopBar({
  children,
  user,
}: {
  children?: React.ReactNode;
  user?: { name: string; role: string } | null;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface/70 px-6 py-3 backdrop-blur-sm">
      <Link href="/" className="text-lg font-semibold tracking-tight text-accent">
        PUENTE
      </Link>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {user && (
        <div className="flex items-center gap-2">
          <Avatar name={user.name} />
          <div className="text-sm leading-tight">
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-foreground/60">{user.role}</p>
          </div>
        </div>
      )}
    </header>
  );
}
