"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { useAuditLog, verifyChain } from "@/lib/audit";

const typeLabels: Record<string, string> = {
  order_requested: "Order requested",
  order_advanced: "Order advanced",
  translation_saved: "Translation saved",
  review_requested: "Second opinion requested",
  review_responded: "Second opinion submitted",
};

/** Professional-only oversight view — reads the chain and verifies it independently of the writer. */
export default function AuditTrail({ patientId }: { patientId: string }) {
  const { events, error } = useAuditLog(patientId);
  const [verification, setVerification] = useState<Awaited<ReturnType<typeof verifyChain>> | null>(null);

  useEffect(() => {
    if (!events) return;
    void verifyChain(events).then(setVerification);
  }, [events]);

  return (
    <section className="space-y-3">
      <h2 className="font-medium text-foreground">Audit trail</h2>
      {error && <p role="alert"><StatusBadge level="critical" label="Could not load the audit trail." /></p>}
      {!error && !events && <p role="status">Loading audit trail…</p>}
      {events?.length === 0 && <p>No recorded events yet.</p>}
      {verification && (
        verification.ok
          ? <StatusBadge level="stable" label="Chain verified" />
          : <StatusBadge level="critical" label={`Chain integrity issue at entry ${verification.brokenAtSeq}`} />
      )}
      <ul className="space-y-2">
        {events?.map((event) => (
          <Card as="li" key={event.id} className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge level="info" label={typeLabels[event.type] ?? event.type} />
              <span className="text-foreground/60">{event.at}</span>
            </div>
            <p>{event.summary}</p>
            <p className="text-xs text-foreground/60">by {event.actor}</p>
          </Card>
        ))}
      </ul>
    </section>
  );
}
