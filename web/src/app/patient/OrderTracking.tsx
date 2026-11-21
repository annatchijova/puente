"use client";

import { useEffect, useState, type FormEvent } from "react";
import { onSnapshot } from "firebase/firestore";
import {
  advanceOrder, nextOrderState, orderCollection, orderDeadline, orderHistory,
  requestOrder, stateLabels, type TrackedOrder,
} from "@/lib/orders";

export default function OrderTracking({ patientId, uid, canManage }: {
  patientId: string;
  uid: string;
  canManage: boolean;
}) {
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [readError, setReadError] = useState(false);
  const [writeError, setWriteError] = useState("");
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => onSnapshot(orderCollection(patientId), (snapshot) => {
    setOrders(snapshot.docs.map((item) => ({ ...item.data(), id: item.id }) as TrackedOrder));
    setReadError(false);
  }, () => {
    setOrders(null);
    setReadError(true);
  }), [patientId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  async function save(operation: () => Promise<void>) {
    setPending(true);
    setWriteError("");
    try {
      await operation();
    } catch (error) {
      setWriteError(error instanceof Error ? error.message : "The order could not be saved.");
    } finally {
      setPending(false);
    }
  }

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) return;
    void save(async () => {
      await requestOrder(patientId, uid, description.trim());
      setDescription("");
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Order tracking</h2>
      {readError && <p role="alert">Could not load orders.</p>}
      {!readError && !orders && <p role="status">Loading orders…</p>}
      {orders?.length === 0 && <p>No orders recorded.</p>}
      {orders && canManage && (
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            Order description
            <input className="rounded border p-2" value={description} required maxLength={200}
              onChange={(event) => setDescription(event.target.value)} disabled={pending} />
          </label>
          <button className="rounded border p-2" disabled={pending || !description.trim()}>
            Request order
          </button>
        </form>
      )}
      {writeError && <p role="alert">{writeError}</p>}
      {pending && <p role="status">Saving order…</p>}
      <ul className="space-y-2">
        {orders?.map((order) => {
          const next = nextOrderState(order.state);
          const deadline = orderDeadline(order);
          return (
            <li key={order.id} className="space-y-2 rounded border p-3">
              <h3 className="font-medium">{order.description}</h3>
              <p>{stateLabels[order.state] ?? "State unavailable"}</p>
              {deadline !== undefined && now > deadline && (
                <p className="font-medium">Follow-up to check · demo window exceeded</p>
              )}
              {next && deadline === undefined && <p>Follow-up timing unavailable.</p>}
              <details>
                <summary>State history</summary>
                <ol className="pl-4 text-sm">
                  {orderHistory(order).map(({ state, at, by }) => (
                    <li key={state}>
                      {stateLabels[state]} · {at && Number.isFinite(at.getTime()) ? at.toLocaleString() : "Time unavailable"} · {by}
                    </li>
                  ))}
                </ol>
              </details>
              {canManage && next && (
                <button type="button" className="underline" disabled={pending}
                  onClick={() => void save(() => advanceOrder(patientId, uid, order))}>
                  Mark as {stateLabels[next].toLowerCase()}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
