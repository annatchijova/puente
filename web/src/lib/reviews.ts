import {
  collection, doc, getDoc, onSnapshot, serverTimestamp, setDoc,
  type Timestamp, type Unsubscribe,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import type { ReviewRequest, ReviewResponse } from "./types";

// createdAt reads back as a Firestore Timestamp (server-assigned), not the
// ISO string the plain type declares for seeded/demo data — same split
// `orders.ts` makes with TrackedOrder.
export type TrackedReviewRequest = Omit<ReviewRequest, "createdAt"> & {
  createdAt: Timestamp | null;
  response: (Omit<ReviewResponse, "createdAt"> & { createdAt: Timestamp | null }) | null;
};

export const reviewRequestCollection = (patientId: string) =>
  collection(db, "patients", patientId, "reviewRequests");

export async function requestReview(
  patientId: string,
  requesterId: string,
  documentId: string,
  resultDigest: string,
  assigneeId: string,
) {
  const ref = doc(reviewRequestCollection(patientId));
  await setDoc(ref, {
    documentId,
    resultDigest,
    requesterId,
    assigneeId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Writes to a fixed response id ("only") under the request. A retry or a
 * second professional racing to submit gets a permission-denied from the
 * create-only rule, surfaced by the caller as "already answered" rather
 * than an unexpected failure.
 */
export async function submitResponse(
  patientId: string,
  requestId: string,
  authorId: string,
  note: string,
) {
  const ref = doc(db, "patients", patientId, "reviewRequests", requestId, "response", "only");
  await setDoc(ref, { authorId, note, createdAt: serverTimestamp() });
}

export function useReviewRequests(patientId: string) {
  const [requests, setRequests] = useState<TrackedReviewRequest[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsubscribes: Unsubscribe[] = [];

    const stopRequests = onSnapshot(
      reviewRequestCollection(patientId),
      async (snapshot) => {
        const next = await Promise.all(
          snapshot.docs.map(async (item) => {
            const data = item.data() as Omit<TrackedReviewRequest, "id" | "response">;
            const responseSnap = await getDoc(
              doc(db, "patients", patientId, "reviewRequests", item.id, "response", "only"),
            );
            return {
              ...data,
              id: item.id,
              response: responseSnap.exists()
                ? (responseSnap.data() as NonNullable<TrackedReviewRequest["response"]>)
                : null,
            } satisfies TrackedReviewRequest;
          }),
        );
        setRequests(next);
        setError(false);
      },
      () => {
        setRequests(null);
        setError(true);
      },
    );
    unsubscribes.push(stopRequests);

    return () => unsubscribes.forEach((stop) => stop());
  }, [patientId]);

  return { requests, error };
}
