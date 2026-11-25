"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";

export default function Home() {
  const { user, loading, signOutUser } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-semibold">PUENTE</h1>
      <p className="max-w-md text-center text-foreground/70">
        Shared clinical record and verifiable clinical translation — demo
        build, fictional data only.
      </p>
      {loading ? (
        <p role="status">Loading…</p>
      ) : user ? (
        <Card className="flex flex-col items-center gap-2">
          <StatusBadge level="stable" label={`Signed in as ${user.email}`} />
          <Link className="text-accent underline" href="/patient/patient-demo-001">
            Open demo patient record
          </Link>
          <button onClick={() => signOutUser()} className="text-sm text-foreground/60 underline">
            Sign out
          </button>
        </Card>
      ) : (
        <a className="text-accent underline" href="/login">
          Sign in
        </a>
      )}
    </main>
  );
}
