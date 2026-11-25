import {
  collection, doc, onSnapshot, serverTimestamp, setDoc,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import type { TranslationSentence } from "./types";

// generatedAt reads back as a Firestore Timestamp (server-assigned), not
// the ISO string the plain type declares — same split as TrackedOrder and
// TrackedReviewRequest.
export interface TrackedTranslation {
  id: string;
  documentId: string;
  sentences: TranslationSentence[];
  generatedAt: Timestamp | null;
  generatedBy: string;
  modality: "on-device" | "cloud";
}

export const translationCollection = (patientId: string) =>
  collection(db, "patients", patientId, "translations");

/**
 * Saves a reviewed explanation as the patient-visible translation of
 * record. Fixed to the document's own id (one translation per document),
 * so a second save for the same document fails the create-only rule —
 * the caller should surface that as "already saved", not a generic error.
 */
export async function saveTranslation(
  patientId: string,
  documentId: string,
  generatedBy: string,
  sentences: TranslationSentence[],
  modality: "on-device" | "cloud",
) {
  const ref = doc(db, "patients", patientId, "translations", documentId);
  await setDoc(ref, { documentId, sentences, generatedBy, modality, generatedAt: serverTimestamp() });
}

export function useTranslations(patientId: string) {
  const [translations, setTranslations] = useState<TrackedTranslation[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => onSnapshot(translationCollection(patientId), (snapshot) => {
    setTranslations(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as TrackedTranslation));
    setError(false);
  }, () => {
    setTranslations(null);
    setError(true);
  }), [patientId]);

  return { translations, error };
}
