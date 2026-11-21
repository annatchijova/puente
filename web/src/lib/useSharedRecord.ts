"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const docsSnap = await getDocs(
          query(
            collection(db, "patients", patientId, "documents"),
            orderBy("createdAt", "desc"),
          ),
        );
        const profsSnap = await getDocs(
          collection(db, "patients", patientId, "treatingProfessionals"),
        );
        if (cancelled) return;
        setDocuments(docsSnap.docs.map((d) => d.data() as ClinicalDocument));
        setTreatingProfessionals(
          profsSnap.docs.map((d) => d.data() as TreatingProfessional),
        );
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load this patient's record.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  return { documents, treatingProfessionals, loading, error };
}
