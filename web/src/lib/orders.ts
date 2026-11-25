import { addDoc, collection, doc, onSnapshot, runTransaction, serverTimestamp, type Timestamp } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "./firebase";
import { recordAuditEvent } from "./audit";
import type { Order, OrderState } from "./types";

export const states: OrderState[] = [
  "requested", "scheduled", "performed", "result_received", "result_reviewed",
];

export const stateLabels: Record<OrderState, string> = {
  requested: "Requested",
  scheduled: "Scheduled",
  performed: "Performed",
  result_received: "Result received",
  result_reviewed: "Result reviewed",
};

const demoWindowHours: Partial<Record<OrderState, number>> = {
  requested: 48,
  scheduled: 168,
  performed: 72,
  result_received: 48,
};

export type TrackedOrder = Omit<Order, "requestedAt" | "stateHistory"> & {
  requestedAt: string | Timestamp | null;
  stateHistory?: Order["stateHistory"];
  transitions?: Partial<Record<OrderState, { at: Timestamp | null; by: string }>>;
};

export function nextOrderState(state: OrderState) {
  const index = states.indexOf(state);
  return index >= 0 ? states[index + 1] : undefined;
}

export function orderHistory(order: TrackedOrder) {
  const legacy = order.stateHistory ?? [];
  return states.flatMap((state) => {
    const transition = order.transitions?.[state];
    if (transition) {
      return [{ state, at: transition.at?.toDate(), by: transition.by }];
    }
    const previous = legacy.find((event) => event.state === state);
    if (previous) return [{ ...previous, at: new Date(previous.at) }];
    if (state !== "requested" || !order.requestedAt) return [];
    const at = typeof order.requestedAt === "string"
      ? new Date(order.requestedAt)
      : order.requestedAt.toDate();
    return [{ state, at, by: order.requestedBy }];
  });
}

export function orderDeadline(order: TrackedOrder) {
  const hours = demoWindowHours[order.state];
  const at = orderHistory(order).find((event) => event.state === order.state)?.at?.getTime();
  return hours !== undefined && at !== undefined && Number.isFinite(at)
    ? at + hours * 60 * 60 * 1000
    : undefined;
}

export const orderCollection = (patientId: string) => collection(db, "patients", patientId, "orders");

export function useOrders(patientId: string) {
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => onSnapshot(orderCollection(patientId), (snapshot) => {
    setOrders(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as TrackedOrder));
    setError(false);
  }, () => {
    setOrders(null);
    setError(true);
  }), [patientId]);

  return { orders, error };
}

export async function requestOrder(patientId: string, uid: string, description: string) {
  const at = serverTimestamp();
  const ref = await addDoc(orderCollection(patientId), {
    description,
    requestedBy: uid,
    requestedAt: at,
    state: "requested",
    transitions: { requested: { at, by: uid } },
  });
  await recordAuditEvent(patientId, {
    type: "order_requested", actor: uid, objectId: ref.id, summary: `Order ${ref.id} requested`,
  }).catch(() => console.warn("Audit log entry failed for order_requested", ref.id));
}

export async function advanceOrder(patientId: string, uid: string, order: TrackedOrder) {
  const next = nextOrderState(order.state);
  if (!next) return;
  const ref = doc(orderCollection(patientId), order.id);
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(ref);
    if (!current.exists() || current.get("state") !== order.state) {
      throw new Error("The order changed. Review its current state and try again.");
    }
    transaction.update(ref, {
      state: next,
      [`transitions.${next}`]: { at: serverTimestamp(), by: uid },
    });
  });
  await recordAuditEvent(patientId, {
    type: "order_advanced", actor: uid, objectId: order.id, summary: `Order ${order.id} advanced to ${next}`,
  }).catch(() => console.warn("Audit log entry failed for order_advanced", order.id));
}
