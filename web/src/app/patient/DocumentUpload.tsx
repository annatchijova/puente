"use client";

import { useState, type FormEvent } from "react";
import { addDocument } from "@/lib/documents";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import StatusBadge from "@/components/ui/StatusBadge";
import type { DocumentKind } from "@/lib/types";

const KIND_LABELS: Record<DocumentKind, string> = {
  order: "Order",
  result: "Result",
  report: "Report",
};

/**
 * The only way a document enters the shared record. Professional-only —
 * a patient never authors one (enforced by firestore.rules, not just this
 * form). Sealing (hash + authorship + timestamp) happens before the write,
 * in lib/documents.ts, the same way scripts/seed.ts seals fictional ones.
 */
export default function DocumentUpload({ patientId, uid }: { patientId: string; uid: string }) {
  const [kind, setKind] = useState<DocumentKind>("result");
  const [content, setContent] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) return;
    setPending(true);
    setError("");
    addDocument(patientId, uid, kind, content.trim())
      .then(() => setContent(""))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not save this document."))
      .finally(() => setPending(false));
  }

  return (
    <CollapsibleSection summary="Add a document">
      <form onSubmit={submit} className="space-y-3 text-sm">
        <p className="text-foreground/60">
          Sealed (hashed, authored, timestamped) the moment it&apos;s saved — never
          editable afterward.
        </p>
        <label className="flex flex-col gap-1">
          Kind
          <select
            className="rounded-lg border border-border bg-surface p-2"
            value={kind}
            onChange={(event) => setKind(event.target.value as DocumentKind)}
            disabled={pending}
          >
            {(Object.keys(KIND_LABELS) as DocumentKind[]).map((k) => (
              <option key={k} value={k}>{KIND_LABELS[k]}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Content
          <textarea
            className="rounded-lg border border-border bg-surface p-2"
            rows={3}
            maxLength={2000}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={pending}
            required
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50"
          disabled={pending || !content.trim()}
        >
          Seal and add
        </button>
        {error && <p role="alert"><StatusBadge level="critical" label={error} /></p>}
      </form>
    </CollapsibleSection>
  );
}
