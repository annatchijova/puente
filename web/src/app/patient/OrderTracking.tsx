"use client";

import { useState, type FormEvent } from "react";
import {
  advanceOrder, nextOrderState, orderDeadline, orderHistory,
  requestOrder, stateLabels, type TrackedOrder,
} from "@/lib/orders";
import { useNow } from "@/lib/useNow";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import CollapsibleSection from "@/components/ui/CollapsibleSection";

export default function OrderTracking({ patientId, uid, canManage, orders, readError }: {
  patientId: string;
  uid: string;
  canManage: boolean;
  orders: TrackedOrder[] | null;
  readError: boolean;
}) {
  const [writeError, setWriteError] = useState("");
  const [pending, setPending] = useState(false);
  const [description, setDescription] = useState("");
  const now = useNow();

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
      <h2 className="font-medium text-foreground">Order tracking</h2>
      {readError && <p role="alert"><StatusBadge level="critical" label="Could not load orders." /></p>}
      {!readError && !orders && <p role="status">Loading orders…</p>}
      {orders?.length === 0 && <p>No orders recorded.</p>}
      {orders && canManage && (
        <form onSubmit={create} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            Order description
            <input className="rounded-md border border-border bg-surface p-2" value={description} required maxLength={200}
              onChange={(event) => setDescription(event.target.value)} disabled={pending} />
          </label>
          <button className="rounded-md bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50" disabled={pending || !description.trim()}>
            Request order
          </button>
        </form>
      )}
      {writeError && <p role="alert"><StatusBadge level="critical" label={writeError} /></p>}
      {pending && <p role="status">Saving order…</p>}
      <ul className="space-y-3">
        {orders?.map((order) => {
          const next = nextOrderState(order.state);
          const deadline = orderDeadline(order);
          const overdue = deadline !== undefined && now > deadline;
          return (
            <Card as="li" key={order.id} className="space-y-2">
              <h3 className="font-medium">{order.description}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge level="info" label={stateLabels[order.state] ?? "State unavailable"} />
                {overdue && (
                  <StatusBadge level="warning" label="Follow-up to check · demo window exceeded" />
                )}
                {next && deadline === undefined && (
                  <StatusBadge level="warning" label="Follow-up timing unavailable" />
                )}
              </div>
              <CollapsibleSection summary="State history">
                <ol className="space-y-1">
                  {orderHistory(order).map(({ state, at, by }) => (
                    <li key={state}>
                      {stateLabels[state]} · {at && Number.isFinite(at.getTime()) ? at.toLocaleString() : "Time unavailable"} · {by}
                    </li>
                  ))}
                </ol>
              </CollapsibleSection>
              {canManage && next && (
                <button type="button" className="text-accent underline" disabled={pending}
                  onClick={() => void save(() => advanceOrder(patientId, uid, order))}>
                  Mark as {stateLabels[next].toLowerCase()}
                </button>
              )}
            </Card>
          );
        })}
      </ul>
    </section>
  );
}
