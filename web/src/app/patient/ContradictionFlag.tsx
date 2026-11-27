"use client";

import { useState, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import { flagContradiction, resolveContradiction, useContradictions } from "@/lib/contradictions";
import type { ClinicalDocument } from "@/lib/types";

/** Professional-only. Manual flagging only — no automated detection. */
export default function ContradictionFlag({ patientId, uid, documents }: {
  patientId: string;
  uid: string;
  documents: ClinicalDocument[];
}) {
  const { contradictions, error } = useContradictions(patientId);
  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [flagError, setFlagError] = useState("");

  const unresolved = (contradictions ?? []).filter((c) => !c.resolved);
  const resolved = (contradictions ?? []).filter((c) => c.resolved);

  function flag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!docA || !docB || docA === docB || !note.trim()) return;
    setPending(true);
    setFlagError("");
    flagContradiction(patientId, uid, docA, docB, note.trim())
      .then(() => {
        setDocA("");
        setDocB("");
        setNote("");
      })
      .catch((err) => setFlagError(err instanceof Error ? err.message : "Could not flag this contradiction."))
      .finally(() => setPending(false));
  }

  function resolve(contradictionId: string) {
    const resolutionNote = window.prompt("Resolution note:");
    if (!resolutionNote?.trim()) return;
    void resolveContradiction(patientId, contradictionId, uid, resolutionNote.trim());
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium text-foreground">Documentary contradictions</h2>
      {error && <p role="alert"><StatusBadge level="critical" label="Could not load contradictions." /></p>}

      {documents.length >= 2 && (
        <form onSubmit={flag} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Document A
            <select className="rounded-md border border-border bg-surface p-2" value={docA}
              onChange={(e) => setDocA(e.target.value)} disabled={pending}>
              <option value="">Select a document</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.id} — {d.kind}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Document B
            <select className="rounded-md border border-border bg-surface p-2" value={docB}
              onChange={(e) => setDocB(e.target.value)} disabled={pending}>
              <option value="">Select a document</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.id} — {d.kind}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Note
            <input className="rounded-md border border-border bg-surface p-2" value={note} required maxLength={300}
              onChange={(e) => setNote(e.target.value)} disabled={pending} />
          </label>
          <button type="submit" className="rounded-md bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50"
            disabled={pending || !docA || !docB || docA === docB || !note.trim()}>
            Flag
          </button>
        </form>
      )}
      {flagError && <p role="alert"><StatusBadge level="critical" label={flagError} /></p>}

      <ul className="space-y-2">
        {unresolved.map((c) => (
          <Card as="li" key={c.id} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge level="warning" label="Unresolved" />
              <span className="text-sm">{c.documentIds[0]} ↔ {c.documentIds[1]}</span>
            </div>
            <p className="text-sm">{c.note}</p>
            <button type="button" className="text-accent underline text-sm" onClick={() => resolve(c.id)}>
              Mark resolved
            </button>
          </Card>
        ))}
        {resolved.map((c) => (
          <CollapsibleSection key={c.id} summary={`Resolved: ${c.documentIds[0]} ↔ ${c.documentIds[1]}`}>
            <p>{c.note}</p>
            {c.resolutionNote && <p className="mt-1 text-foreground/70">Resolution: {c.resolutionNote}</p>}
          </CollapsibleSection>
        ))}
      </ul>
    </section>
  );
}
