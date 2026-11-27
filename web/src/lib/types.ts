export type DocumentKind = "order" | "result" | "report";

export interface Patient {
  id: string;
  displayName: string;
  dateOfBirth: string; // ISO date
}

export interface TreatingProfessional {
  professionalId: string;
  displayName: string;
  specialty: string;
  addedAt: string; // ISO timestamp
}

export interface ClinicalDocument {
  id: string;
  kind: DocumentKind;
  authorId: string;
  createdAt: string; // ISO timestamp
  content: string; // original clinical text, verbatim
  sha256: string; // hash of the canonical content, sealed at write time
}

export interface TranslationSentence {
  text: string;
  sourceSpan: string | null; // exact substring of ClinicalDocument.content
  unjustified: boolean; // true when no sourceSpan supports this sentence
}

export interface Translation {
  id: string; // same id as the ClinicalDocument it translates
  documentId: string;
  sentences: TranslationSentence[];
  generatedAt: string; // ISO timestamp
  generatedBy: string; // uid of the treating professional who saved it
  modality: "on-device" | "cloud"; // which hybrid-inference path produced it
}

export type OrderState =
  | "requested"
  | "scheduled"
  | "performed"
  | "result_received"
  | "result_reviewed";

export interface Order {
  id: string;
  description: string;
  state: OrderState;
  requestedBy: string;
  requestedAt: string; // ISO timestamp
  stateHistory: { state: OrderState; at: string; by: string }[];
}

export interface Review {
  id: string;
  documentId: string; // the ClinicalDocument being reviewed
  authorId: string;
  createdAt: string; // ISO timestamp
  note: string;
}

// Level 4 peer review (see docs/peer-review-design.md). Distinct from
// Review above: a ReviewRequest assigns a specific result to a specific
// professional for a second opinion, and its ReviewResponse is stored at a
// fixed path so a retry or duplicate submission cannot create a second one.
export interface ReviewRequest {
  id: string;
  documentId: string; // the reviewed result's ClinicalDocument id
  resultDigest: string; // sha256 captured from the document at request time
  requesterId: string;
  assigneeId: string;
  createdAt: string; // ISO timestamp, server-assigned
}

export interface ReviewResponse {
  authorId: string; // must equal the parent request's assigneeId
  note: string;
  createdAt: string; // ISO timestamp, server-assigned
}

// Level 6.3 tamper-evident audit trail (see docs/levels.md). Each event is
// hash-chained to the previous one via `previousHash`/`entryHash`; the
// chain is verified by lib/audit.ts's verifyChain, not by Firestore rules
// (no hash primitive in the rules language — see firestore.rules).
export type AuditEventType =
  | "order_requested"
  | "order_advanced"
  | "translation_saved"
  | "review_requested"
  | "review_responded"
  | "contradiction_flagged"
  | "contradiction_resolved";

export interface AuditEvent {
  id: string;
  seq: number;
  type: AuditEventType;
  actor: string; // uid
  objectId: string; // orderId / documentId / reviewRequestId
  summary: string; // id/state references only — no clinical content
  at: string; // ISO, client-asserted; part of the hashed payload
  previousHash: string | null;
  entryHash: string;
}

// Level 6.1 documentary contradiction flagging (see docs/levels.md).
// Manual only — no automated detection, per Level 6's ban on predictive
// models in the decision path.
export interface Contradiction {
  id: string;
  documentIds: [string, string];
  note: string;
  flaggedBy: string;
  flaggedAt: string; // ISO timestamp, server-assigned
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null; // ISO timestamp, server-assigned
  resolutionNote: string | null;
}
