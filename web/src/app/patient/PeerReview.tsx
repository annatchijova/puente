"use client";

import { useState, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { requestReview, submitResponse, useReviewRequests } from "@/lib/reviews";
import type { ClinicalDocument, TreatingProfessional } from "@/lib/types";

function formatTimestamp(at: { toDate: () => Date } | null) {
  return at ? at.toDate().toLocaleString() : "Time unavailable";
}

/**
 * Scoped to a single result document. Shown to treating professionals only
 * — a patient never sees a "request second opinion" action, matching the
 * Level 1 authority model (patients read, they don't direct care) and the
 * reviewRequests rule, which denies patient reads outright.
 */
export default function PeerReview({
  patientId,
  document,
  uid,
  treatingProfessionals,
}: {
  patientId: string;
  document: ClinicalDocument;
  uid: string;
  treatingProfessionals: TreatingProfessional[];
}) {
  const { requests, error } = useReviewRequests(patientId);
  const [assigneeId, setAssigneeId] = useState("");
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState("");

  const forThisDocument = (requests ?? []).filter((r) => r.documentId === document.id);
  const assignableColleagues = treatingProfessionals.filter((p) => p.professionalId !== uid);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigneeId) return;
    setPending(true);
    setRequestError("");
    requestReview(patientId, uid, document.id, document.sha256, assigneeId)
      .catch((err) => setRequestError(err instanceof Error ? err.message : "Could not request a second opinion."))
      .finally(() => setPending(false));
  }

  function respond(requestId: string, note: string) {
    return submitResponse(patientId, requestId, uid, note).catch((err) => {
      throw err instanceof Error ? err : new Error("Could not submit the response.");
    });
  }

  return (
    <section className="space-y-2" aria-label="Peer review">
      <h3 className="text-sm font-medium">Second opinions</h3>
      {error && <p role="alert"><StatusBadge level="critical" label="Could not load review requests." /></p>}

      {assignableColleagues.length > 0 && (
        <form onSubmit={create} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Request a second opinion from
            <select
              className="rounded-md border border-border bg-surface p-2"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
              disabled={pending}
            >
              <option value="">Select a colleague</option>
              {assignableColleagues.map((p) => (
                <option key={p.professionalId} value={p.professionalId}>
                  {p.displayName} — {p.specialty}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50"
            disabled={pending || !assigneeId}
          >
            Request
          </button>
        </form>
      )}
      {requestError && <p role="alert"><StatusBadge level="critical" label={requestError} /></p>}

      <ul className="space-y-2">
        {forThisDocument.map((request) => (
          <Card as="li" key={request.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span>
                Requested from{" "}
                {treatingProfessionals.find((p) => p.professionalId === request.assigneeId)?.displayName
                  ?? request.assigneeId}
              </span>
              {request.response ? (
                <StatusBadge level="stable" label="Answered" />
              ) : (
                <StatusBadge level="info" label="Open" />
              )}
            </div>
            {request.response ? (
              <CollapsibleSection summary="Response">
                <p>{request.response.note}</p>
                <p className="mt-1 text-xs text-foreground/70">
                  {formatTimestamp(request.response.createdAt)}
                </p>
              </CollapsibleSection>
            ) : (
              uid === request.assigneeId && <ResponseForm onSubmit={(note) => respond(request.id, note)} />
            )}
          </Card>
        ))}
      </ul>
    </section>
  );
}

function ResponseForm({ onSubmit }: { onSubmit: (note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!note.trim()) return;
    setPending(true);
    setError("");
    onSubmit(note.trim())
      .catch((err) => setError(err instanceof Error ? err.message : "This request may already have a response."))
      .finally(() => setPending(false));
  }

  return (
    <form onSubmit={submit} className="space-y-2 text-sm">
      <label className="flex flex-col gap-1">
        Your opinion
        <textarea
          className="rounded-md border border-border bg-surface p-2"
          value={note}
          required
          maxLength={2000}
          onChange={(event) => setNote(event.target.value)}
          disabled={pending}
        />
      </label>
      <button
        type="submit"
        className="rounded-md bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50"
        disabled={pending || !note.trim()}
      >
        Submit opinion
      </button>
      {error && <p role="alert"><StatusBadge level="critical" label={error} /></p>}
    </form>
  );
}
