"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import type { ClinicalDocument, TreatingProfessional } from "./types";

interface SharedRecord {
  documents: ClinicalDocument[];
  treatingProfessionals: TreatingProfessional[];
  loading: boolean;
  error: string | null;
}

export function useSharedRecord(patientId: string): SharedRecord {
  const [documents, setDocuments] = useState<ClinicalDocument[]>([]);
  const [treatingProfessionals, setTreatingProfessionals] = useState<
    TreatingProfessional[]
  >([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [profsLoading, setProfsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live-listened: a treating professional can add a document at runtime
  // (DocumentUpload.tsx), and every other document reader in the app
  // (translations, reviews, contradictions) already expects to see it
  // without a page reload.
  useEffect(() => {
    return onSnapshot(
      query(collection(db, "patients", patientId, "documents"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setDocuments(snapshot.docs.map((d) => d.data() as ClinicalDocument));
        setDocumentsLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err.message : "Could not load this patient's record.");
        setDocumentsLoading(false);
      },
    );
  }, [patientId]);

  // One-time read: nothing in the app currently adds, removes, or changes
  // treatingProfessionals membership at runtime (it's seed/admin-only), so
  // a live listener would just be an idle connection.
  useEffect(() => {
    let cancelled = false;
    getDocs(collection(db, "patients", patientId, "treatingProfessionals"))
      .then((snap) => {
        if (cancelled) return;
        setTreatingProfessionals(snap.docs.map((d) => d.data() as TreatingProfessional));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this patient's record.");
        }
      })
      .finally(() => {
        if (!cancelled) setProfsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return { documents, treatingProfessionals, loading: documentsLoading || profsLoading, error };
}
