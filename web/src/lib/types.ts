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
