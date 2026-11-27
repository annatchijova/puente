import {
  addDoc, collection, doc, onSnapshot, serverTimestamp, updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { recordAuditEvent } from "./audit";

export interface TrackedContradiction {
  id: string;
  documentIds: [string, string];
  note: string;
  flaggedBy: string;
  flaggedAt: Timestamp | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: Timestamp | null;
  resolutionNote: string | null;
}

const contradictionCollection = (patientId: string) =>
  collection(db, "patients", patientId, "contradictions");

export async function flagContradiction(
  patientId: string,
  flaggedBy: string,
  documentIdA: string,
  documentIdB: string,
  note: string,
) {
  const ref = await addDoc(contradictionCollection(patientId), {
    documentIds: [documentIdA, documentIdB],
    note,
    flaggedBy,
    flaggedAt: serverTimestamp(),
    resolved: false,
    resolvedBy: null,
    resolvedAt: null,
    resolutionNote: null,
  });
  await recordAuditEvent(patientId, {
    type: "contradiction_flagged", actor: flaggedBy, objectId: ref.id,
    summary: `Contradiction flagged between ${documentIdA} and ${documentIdB}`,
  }).catch(() => console.warn("Audit log entry failed for contradiction_flagged", ref.id));
}

export async function resolveContradiction(
  patientId: string,
  contradictionId: string,
  resolvedBy: string,
  resolutionNote: string,
) {
  const ref = doc(contradictionCollection(patientId), contradictionId);
  await updateDoc(ref, {
    resolved: true,
    resolvedBy,
    resolvedAt: serverTimestamp(),
    resolutionNote,
  });
  await recordAuditEvent(patientId, {
    type: "contradiction_resolved", actor: resolvedBy, objectId: contradictionId,
    summary: `Contradiction ${contradictionId} resolved`,
  }).catch(() => console.warn("Audit log entry failed for contradiction_resolved", contradictionId));
}

export function useContradictions(patientId: string) {
  const [contradictions, setContradictions] = useState<TrackedContradiction[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => onSnapshot(contradictionCollection(patientId), (snapshot) => {
    setContradictions(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as TrackedContradiction));
    setError(false);
  }, () => {
    setContradictions(null);
    setError(true);
  }), [patientId]);

  return { contradictions, error };
}
