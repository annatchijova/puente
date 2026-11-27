"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useSharedRecord } from "@/lib/useSharedRecord";
import { orderDeadline, useOrders } from "@/lib/orders";
import { useTranslations } from "@/lib/translations";
import { useContradictions } from "@/lib/contradictions";
import { useNow } from "@/lib/useNow";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import SpeechButton from "@/components/ui/SpeechButton";
import TopBar from "@/components/ui/TopBar";
import AuditTrail from "../AuditTrail";
import ContradictionFlag from "../ContradictionFlag";
import DocumentProvenance from "../DocumentProvenance";
import OrderTracking from "../OrderTracking";
import PeerReview from "../PeerReview";
import TraceableDraft, { demoPatientId, demoDocumentId } from "../TraceableDraft";
import TranslationView from "../TranslationView";
import { useReviewRequests } from "@/lib/reviews";

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
  const { orders, error: ordersError } = useOrders(patientId);
  const { translations } = useTranslations(patientId);
  const { contradictions } = useContradictions(patientId);
  const { requests: reviewRequests } = useReviewRequests(patientId);
  const now = useNow();

  if (authLoading) return <main className="p-8">Loading…</main>;
  if (!user) {
    return (
      <main className="p-8">
        <p>
          You need to <a className="text-accent underline" href="/login">sign in</a> to
          view this record.
        </p>
      </main>
    );
  }

  const canManage = treatingProfessionals.some((professional) => professional.professionalId === user.uid);
  const overdueOrders = (orders ?? []).filter((order) => {
    const deadline = orderDeadline(order);
    return deadline !== undefined && now > deadline;
  });
  const unresolvedContradictions = (contradictions ?? []).filter((c) => !c.resolved);
  const self = treatingProfessionals.find((p) => p.professionalId === user.uid);
  const topBarUser = canManage
    ? { name: self?.displayName ?? user.email ?? "Professional", role: self?.specialty ?? "Professional" }
    : { name: user.email ?? "Patient", role: "Patient" };

  return (
    <>
      <TopBar user={topBarUser}>
        <StatusBadge level="info" label={canManage ? "Professional view" : "Patient view"} />
        {overdueOrders.length > 0 && (
          <StatusBadge level="warning" label={`${overdueOrders.length} order${overdueOrders.length === 1 ? "" : "s"} overdue`} />
        )}
        {unresolvedContradictions.length > 0 && (
          <StatusBadge level="warning" label={`${unresolvedContradictions.length} unresolved contradiction${unresolvedContradictions.length === 1 ? "" : "s"}`} />
        )}
      </TopBar>
      <main className="mx-auto max-w-2xl space-y-6 p-8">
        <h1 className="text-xl font-semibold">Shared record — {patientId}</h1>

        <Card as="section">
          <h2 className="mb-2 font-medium">Treating professionals</h2>
          <ul className="space-y-1 text-sm text-foreground/80">
            {treatingProfessionals.map((p) => (
              <li key={p.professionalId}>
                {p.displayName} — {p.specialty}
              </li>
            ))}
          </ul>
        </Card>

        <Card as="section">
          <h2 className="mb-2 font-medium">Documents</h2>
          {loading && <p role="status">Loading…</p>}
          {error && (
            <p role="alert" className="text-sm">
              <StatusBadge level="critical" label={error} />
              {" "}(if you&apos;re not one of this patient&apos;s treating
              professionals or the patient themselves, access is denied by
              design — see the Level 1 authority model in TECHNICAL.md)
            </p>
          )}
          <ul className="space-y-3">
            {documents.map((doc) => (
              <Card as="li" key={doc.id} className="space-y-1">
                <p className="text-xs text-foreground/60">
                  {doc.kind} · {new Date(doc.createdAt).toLocaleString()} ·
                  sealed sha256:{doc.sha256.slice(0, 12)}…
                </p>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p>{doc.content}</p>
                  <SpeechButton text={doc.content} label="Listen to original" />
                </div>
                {translations?.find((t) => t.documentId === doc.id) && (
                  <>
                    <TranslationView translation={translations.find((t) => t.documentId === doc.id)!} />
                    {canManage && (
                      <DocumentProvenance
                        document={doc}
                        translation={translations.find((t) => t.documentId === doc.id)!}
                        reviewRequests={reviewRequests ?? []}
                        contradictions={contradictions ?? []}
                        treatingProfessionals={treatingProfessionals}
                      />
                    )}
                  </>
                )}
                {patientId === demoPatientId && doc.id === demoDocumentId && canManage && (
                  <TraceableDraft key={`${user.uid}:${doc.sha256}`} uid={user.uid} document={doc} />
                )}
                {doc.kind === "result" && canManage && (
                  <PeerReview
                    key={`${user.uid}:${doc.id}`}
                    patientId={patientId}
                    document={doc}
                    uid={user.uid}
                    treatingProfessionals={treatingProfessionals}
                  />
                )}
              </Card>
            ))}
          </ul>
        </Card>

        <Card as="section">
          <OrderTracking
            key={`${user.uid}:${patientId}`}
            patientId={patientId}
            uid={user.uid}
            canManage={canManage}
            orders={orders}
            readError={ordersError}
          />
        </Card>

        {canManage && (
          <Card as="section">
            <ContradictionFlag patientId={patientId} uid={user.uid} documents={documents} />
          </Card>
        )}

        {canManage && (
          <Card as="section">
            <AuditTrail patientId={patientId} />
          </Card>
        )}
      </main>
    </>
  );
}
