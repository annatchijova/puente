"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch {
      setError("Could not sign in. Check the email and password.");
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <Card as="section" className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <h1 className="text-xl font-semibold">PUENTE — Sign in</h1>
          <p className="text-sm text-foreground/70">
            Fictional demo accounts only — no real patient data.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3 py-2"
            required
          />
          {error && <p role="alert"><StatusBadge level="critical" label={error} /></p>}
          <button
            type="submit"
            className="w-full rounded-md bg-accent px-3 py-2 text-accent-foreground"
          >
            Sign in
          </button>
        </form>
      </Card>
    </main>
  );
}
