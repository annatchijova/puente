"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";

export default function Home() {
  const { user, loading, signOutUser } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
      <h1 className="text-3xl font-semibold tracking-tight text-accent">PUENTE</h1>
      <p className="max-w-md text-center text-foreground/70">
        Shared clinical record and verifiable clinical translation — demo
        build, fictional data only.
      </p>
      {loading ? (
        <p role="status">Loading…</p>
      ) : user ? (
        <Card className="flex flex-col items-center gap-3">
          <StatusBadge level="stable" label={`Signed in as ${user.email}`} />
          <div className="flex flex-col items-center gap-2">
            <Link
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              href="/patient/patient-demo-001"
            >
              Demo case 1 — documentary contradiction
            </Link>
            <Link
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
              href="/patient/patient-demo-002"
            >
              Demo case 2 — order tracking + second opinion
            </Link>
          </div>
          <button onClick={() => signOutUser()} className="text-sm text-foreground/60 underline">
            Sign out
          </button>
        </Card>
      ) : (
        <a
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
          href="/login"
        >
          Sign in
        </a>
      )}
    </main>
  );
}
