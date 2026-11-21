"use client";

import Link from "next/link";
import { useAuth } from "@/lib/AuthProvider";

export default function Home() {
  const { user, loading, signOutUser } = useAuth();

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-semibold">PUENTE</h1>
      <p className="text-gray-600 max-w-md text-center">
        Shared clinical record and verifiable clinical translation — demo
        build, fictional data only.
      </p>
      {loading ? (
        <p>Loading…</p>
      ) : user ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm text-gray-500">Signed in as {user.email}</p>
          <Link className="underline" href="/patient/patient-demo-001">
            Open demo patient record
          </Link>
          <button onClick={() => signOutUser()} className="text-sm text-gray-500 underline">
            Sign out
          </button>
        </div>
      ) : (
        <a className="underline" href="/login">
          Sign in
        </a>
      )}
    </main>
  );
}
