import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { sealDocument } from "./canonical";
import { recordAuditEvent } from "./audit";
import type { DocumentKind } from "./types";

export const documentCollection = (patientId: string) => collection(db, "patients", patientId, "documents");

/**
 * Seals and adds a new clinical document — the only way one enters the
 * record. Treating-professional-only per firestore.rules; a patient is
 * never the author. createdAt is a plain ISO string (not serverTimestamp),
 * matching ClinicalDocument's type and so it can be hashed client-side
 * before the write, the same way scripts/seed.ts seals fictional documents.
 */
export async function addDocument(
  patientId: string,
  authorId: string,
  kind: DocumentKind,
  content: string,
) {
  const createdAt = new Date().toISOString();
  const sha256 = await sealDocument({ kind, authorId, createdAt, content });
  const ref = doc(documentCollection(patientId));
  await setDoc(ref, { id: ref.id, kind, authorId, createdAt, content, sha256 });
  await recordAuditEvent(patientId, {
    type: "document_sealed", actor: authorId, objectId: ref.id,
    summary: `Document ${ref.id} (${kind}) sealed`,
  }).catch(() => console.warn("Audit log entry failed for document_sealed", ref.id));
  return ref.id;
}
