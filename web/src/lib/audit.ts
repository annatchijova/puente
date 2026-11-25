import {
  collection, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { canonicalStringify, sha256Hex } from "./canonical";
import type { AuditEvent, AuditEventType } from "./types";

// recordedAt reads back as a Firestore Timestamp — stored alongside the
// hashed fields for display/sort robustness, but not part of the hash
// itself (a serverTimestamp() sentinel can't be hashed client-side before
// the server resolves it). Mirrors CLAUDE.md §5.2's "timestamp recorded
// outside the sealed payload."
export type TrackedAuditEvent = AuditEvent & { recordedAt: Timestamp | null };

const auditLogCollection = (patientId: string) => collection(db, "patients", patientId, "auditLog");
const headRef = (patientId: string) => doc(db, "patients", patientId, "auditLog", "_head");

/**
 * Additive instrumentation: called after an existing write already
 * succeeded. Throws on failure — callers catch it and warn, but must not
 * treat it as failure of the primary action (§5.3: a non-critical failure
 * must not destroy valid work).
 */
export async function recordAuditEvent(
  patientId: string,
  event: { type: AuditEventType; actor: string; objectId: string; summary: string },
) {
  await runTransaction(db, async (tx) => {
    const head = await tx.get(headRef(patientId));
    const seq = head.exists() ? (head.data().seq as number) + 1 : 0;
    const previousHash = head.exists() ? (head.data().entryHash as string) : null;
    const at = new Date().toISOString();
    const entryHash = await sha256Hex(canonicalStringify({
      seq, type: event.type, actor: event.actor, objectId: event.objectId,
      summary: event.summary, at, previousHash,
    }));
    const entry = { seq, ...event, at, previousHash, entryHash, recordedAt: serverTimestamp() };
    tx.set(doc(auditLogCollection(patientId)), entry);
    tx.set(headRef(patientId), { seq, entryHash });
  });
}

export function useAuditLog(patientId: string) {
  const [events, setEvents] = useState<TrackedAuditEvent[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => onSnapshot(
    query(auditLogCollection(patientId), orderBy("seq")),
    (snapshot) => {
      setEvents(
        snapshot.docs
          .filter((item) => item.id !== "_head")
          .map((item) => ({ ...item.data(), id: item.id }) as TrackedAuditEvent),
      );
      setError(false);
    },
    () => {
      setEvents(null);
      setError(true);
    },
  ), [patientId]);

  return { events, error };
}

export interface ChainVerification {
  ok: boolean;
  brokenAtSeq: number | null;
}

/**
 * Stdlib-only, independent of the producing code (CLAUDE.md §5.2): walks
 * the chain, recomputes every hash, and checks each link. This — not a
 * Firestore rule — is what makes the log tamper-evident.
 */
export async function verifyChain(events: TrackedAuditEvent[]): Promise<ChainVerification> {
  let previousHash: string | null = null;
  for (const event of events) {
    const expectedHash = await sha256Hex(canonicalStringify({
      seq: event.seq, type: event.type, actor: event.actor, objectId: event.objectId,
      summary: event.summary, at: event.at, previousHash: event.previousHash,
    }));
    if (event.previousHash !== previousHash || event.entryHash !== expectedHash) {
      return { ok: false, brokenAtSeq: event.seq };
    }
    previousHash = event.entryHash;
  }
  return { ok: true, brokenAtSeq: null };
}
