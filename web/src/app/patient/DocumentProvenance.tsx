import CollapsibleSection from "@/components/ui/CollapsibleSection";
import StatusBadge from "@/components/ui/StatusBadge";
import type { TrackedTranslation } from "@/lib/translations";
import type { TrackedReviewRequest } from "@/lib/reviews";
import type { TrackedContradiction } from "@/lib/contradictions";
import type { ClinicalDocument, TreatingProfessional } from "@/lib/types";

function formatTimestamp(at: { toDate: () => Date } | null) {
  return at ? at.toDate().toLocaleString() : "Time unavailable";
}

function professionalName(uid: string, treatingProfessionals: TreatingProfessional[]) {
  return treatingProfessionals.find((p) => p.professionalId === uid)?.displayName ?? uid;
}

/**
 * Level 6.2 explainability panel. Surfaces, per AI-generated claim, where it
 * came from and what's known about its review — by reading the Translation
 * (Level 2), PeerReview (Level 4), and Contradiction (Level 6.1) data these
 * features already record, not by adding a second source of truth.
 *
 * Invariant: a source-span link proves where a claim came from, not that
 * it's clinically correct. This panel never upgrades "traced" to "correct".
 *
 * Professional-only: a patient does not need to audit the provenance of
 * their own translated explanation to use it; this is a review-support
 * surface for the treating professional, consistent with reviews and
 * contradiction flagging already being professional-only.
 */
export default function DocumentProvenance({
  document,
  translation,
  reviewRequests,
  contradictions,
  treatingProfessionals,
}: {
  document: ClinicalDocument;
  translation: TrackedTranslation;
  reviewRequests: TrackedReviewRequest[];
  contradictions: TrackedContradiction[];
  treatingProfessionals: TreatingProfessional[];
}) {
  const forThisDocument = reviewRequests.filter((r) => r.documentId === document.id);
  const flaggedForThisDocument = contradictions.filter((c) => c.documentIds.includes(document.id));

  return (
    <CollapsibleSection summary="Explainability and provenance">
      <div className="space-y-3 text-sm">
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
          <dt className="text-foreground/60">Source document</dt>
          <dd>{document.id} ({document.kind})</dd>
          <dt className="text-foreground/60">Document version</dt>
          <dd className="font-mono text-xs">sha256:{document.sha256}</dd>
          <dt className="text-foreground/60">Inference modality</dt>
          <dd>{translation.modality === "on-device" ? "On-device (Gemini Nano)" : "Cloud (Gemini Developer API)"}</dd>
          <dt className="text-foreground/60">Validated by</dt>
          <dd>
            {professionalName(translation.generatedBy, treatingProfessionals)}
            {" · "}
            {formatTimestamp(translation.generatedAt)}
          </dd>
        </dl>

        <div>
          <p className="mb-1 font-medium">Per-claim source spans</p>
          <ul className="space-y-1">
            {translation.sentences.map((sentence, index) => (
              <li key={index} className="rounded-md border border-border p-2">
                <p>{sentence.text}</p>
                {sentence.unjustified ? (
                  <StatusBadge level="warning" label="Unjustified — no source span supports this claim" />
                ) : (
                  <blockquote className="border-l-2 border-border pl-2 text-foreground/70">
                    &ldquo;{sentence.sourceSpan}&rdquo;
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-1 font-medium">Review observations</p>
          {forThisDocument.length === 0 ? (
            <p className="text-foreground/60">No second-opinion requests on this document.</p>
          ) : (
            <ul className="space-y-1">
              {forThisDocument.map((request) => (
                <li key={request.id}>
                  {request.response ? (
                    <>
                      <StatusBadge level="info" label="Second opinion recorded" />
                      {" "}
                      <span>
                        {professionalName(request.response.authorId, treatingProfessionals)}:{" "}
                        {request.response.note}
                      </span>
                    </>
                  ) : (
                    <StatusBadge level="warning" label={`Second opinion pending from ${professionalName(request.assigneeId, treatingProfessionals)}`} />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-1 font-medium">Documentary contradictions</p>
          {flaggedForThisDocument.length === 0 ? (
            <p className="text-foreground/60">None flagged against this document.</p>
          ) : (
            <ul className="space-y-1">
              {flaggedForThisDocument.map((c) => (
                <li key={c.id}>
                  <StatusBadge level={c.resolved ? "stable" : "warning"} label={c.resolved ? "Resolved" : "Unresolved"} />
                  {" "}
                  <span>vs. {c.documentIds.find((id) => id !== document.id)} — {c.note}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
}
