"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useSharedRecord } from "@/lib/useSharedRecord";
import OrderTracking from "../OrderTracking";
import TraceableDraft, { demoPatientId, demoDocumentId } from "../TraceableDraft";

export default function PatientRecordPage() {
  return (
    <Suspense fallback={<main className="p-8">Loading…</main>}>
      <PatientRecord />
    </Suspense>
  );
}

function PatientRecord() {
  const { patientId } = useParams<{ patientId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { documents, treatingProfessionals, loading, error } =
    useSharedRecord(patientId);

  if (authLoading) return <main className="p-8">Loading…</main>;
  if (!user) {
    return (
      <main className="p-8">
        <p>
          You need to <a className="underline" href="/login">sign in</a> to
          view this record.
        </p>
      </main>
    );
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Shared record — {patientId}</h1>

      <section>
        <h2 className="font-medium mb-2">Treating professionals</h2>
        <ul className="text-sm text-gray-700 space-y-1">
          {treatingProfessionals.map((p) => (
            <li key={p.professionalId}>
              {p.displayName} — {p.specialty}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-medium mb-2">Documents</h2>
        {loading && <p>Loading…</p>}
        {error && (
          <p className="text-red-600 text-sm">
            {error} (if you&apos;re not one of this patient&apos;s treating
            professionals or the patient themselves, access is denied by
            design — see the Level 1 authority model in TECHNICAL.md)
          </p>
        )}
        <ul className="space-y-3">
          {documents.map((doc) => (
            <li key={doc.id} className="border rounded p-3">
              <p className="text-xs text-gray-500">
                {doc.kind} · {new Date(doc.createdAt).toLocaleString()} ·
                sealed sha256:{doc.sha256.slice(0, 12)}…
              </p>
              <p className="mt-1">{doc.content}</p>
              {patientId === demoPatientId && doc.id === demoDocumentId &&
                treatingProfessionals.some((professional) => professional.professionalId === user.uid) && (
                  <TraceableDraft key={`${user.uid}:${doc.sha256}`} uid={user.uid} document={doc} />
                )}
            </li>
          ))}
        </ul>
      </section>

      <OrderTracking key={`${user.uid}:${patientId}`} patientId={patientId} uid={user.uid}
        canManage={treatingProfessionals.some((professional) => professional.professionalId === user.uid)} />
    </main>
  );
}
