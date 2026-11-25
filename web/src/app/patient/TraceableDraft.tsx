"use client";

import { useState } from "react";
import { GoogleAIBackend, getAI, getGenerativeModel, InferenceMode, InferenceSource, Schema } from "firebase/ai";
import { doc, getDocFromServer } from "firebase/firestore";
import { app, auth, db } from "@/lib/firebase";
import { sealDocument } from "@/lib/canonical";
import { parseDraft } from "@/lib/traceableDraft";
import { saveTranslation } from "@/lib/translations";
import type { ClinicalDocument, TranslationSentence } from "@/lib/types";
import StatusBadge from "@/components/ui/StatusBadge";

export const demoPatientId = "patient-demo-001";
export const demoDocumentId = "doc-cbc-001";
const demoDocument = "Hemoglobin 10.2 g/dL. MCV 72 fL. Requesting iron panel to extend the workup.";
const draftSchema = Schema.array({
  items: Schema.object({
    properties: {
      text: Schema.string(),
      sourceSpan: Schema.string({ nullable: true }),
    },
  }),
});

const demoSymptoms = "I've felt unusually tired for three days. I felt dizzy when I stood up this morning.";

type DraftKind = "explanation" | "symptoms";
type RawModality = "on-device" | "cloud" | null;
type Draft = {
  kind: DraftKind;
  modality: string;
  rawModality: RawModality;
  statements: ReturnType<typeof parseDraft>;
};

export default function TraceableDraft({ document, uid }: {
  document: ClinicalDocument;
  uid: string;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState("");

  async function generate(kind: DraftKind) {
    setDraft(null);
    setError("");
    setPending(true);
    try {
      const model = getGenerativeModel(getAI(app, { backend: new GoogleAIBackend() }), {
        mode: InferenceMode.PREFER_ON_DEVICE,
        inCloudParams: {
          model: "gemini-3.5-flash-lite",
          generationConfig: { responseMimeType: "application/json", responseSchema: draftSchema },
        },
        onDeviceParams: { promptOptions: { responseConstraint: draftSchema } },
      });
      void model.initializeDeviceModel().catch(() => {
        // The hybrid SDK uses cloud inference if the device model is unavailable.
      });

      const [membership, snapshot] = await Promise.all([
        getDocFromServer(doc(db, "patients", demoPatientId, "treatingProfessionals", uid)),
        getDocFromServer(doc(db, "patients", demoPatientId, "documents", demoDocumentId)),
      ]);
      const current = snapshot.data() as ClinicalDocument | undefined;
      if (!membership.exists() || !current || current.id !== demoDocumentId ||
          current.content !== demoDocument || current.sha256 !== document.sha256 ||
          await sealDocument({
            kind: current.kind,
            authorId: current.authorId,
            createdAt: current.createdAt,
            content: current.content,
          }) !== current.sha256 || auth.currentUser?.uid !== uid) {
        setError("This demo requires an authorized professional and the original sealed example.");
        return;
      }

      const source = kind === "explanation" ? demoDocument : demoSymptoms;
      const task = kind === "explanation"
        ? "Explain this fictional clinical document in plain English for a patient."
        : "Organize this fictional patient's words into a brief patient-reported symptom draft for a professional.";
      const { response } = await model.generateContent([
        task,
        "Use only the supplied source. Preserve values, units, negations, timing and uncertainty.",
        "Do not add diagnoses, recommendations or inferences.",
        "Return only a JSON array of up to 8 objects. Each object must have text (one sentence) and sourceSpan (a verbatim quote that directly supports it, or null if unsupported).",
        JSON.stringify({ source }),
      ].join("\n"));
      if (auth.currentUser?.uid !== uid) return;

      let statements: ReturnType<typeof parseDraft>;
      try {
        statements = parseDraft(response.text(), source);
      } catch {
        setError("The model returned an unusable draft. Try again.");
        return;
      }

      const rawModality: RawModality = response.inferenceSource === InferenceSource.ON_DEVICE
        ? "on-device"
        : response.inferenceSource === InferenceSource.IN_CLOUD ? "cloud" : null;
      const modality = rawModality === "on-device" ? "On device"
        : rawModality === "cloud" ? "Cloud" : "Inference location unavailable";
      setSaveState("idle");
      setSaveError("");
      setDraft({ kind, statements, modality, rawModality });
    } catch {
      setError("Could not generate a draft. Check access and Firebase AI Logic availability, then try again.");
    } finally {
      setPending(false);
    }
  }

  async function saveToPatientRecord() {
    if (!draft || draft.kind !== "explanation" || !draft.rawModality) return;
    const sentences: TranslationSentence[] = draft.statements.map((statement) =>
      statement
        ? { text: statement.text, sourceSpan: statement.sourceSpan, unjustified: false }
        : { text: "Abstained — no exact source quote was provided.", sourceSpan: null, unjustified: true },
    );
    setSaveState("saving");
    setSaveError("");
    try {
      await saveTranslation(demoPatientId, document.id, uid, sentences, draft.rawModality);
      setSaveState("saved");
    } catch (err) {
      setSaveState("error");
      setSaveError(
        err instanceof Error && err.message.includes("permission")
          ? "This document already has a saved translation."
          : "Could not save this explanation. Try again.",
      );
    }
  }

  return (
    <div className="mt-3 space-y-2 text-sm" aria-busy={pending}>
      <p>Fictional examples. Generation may use cloud inference.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="text-accent underline" disabled={pending} onClick={() => void generate("explanation")}>
          Draft a plain-language explanation
        </button>
        <button type="button" className="text-accent underline" disabled={pending} onClick={() => void generate("symptoms")}>
          Draft a note from example symptoms
        </button>
      </div>
      {pending && <p role="status">Generating draft…</p>}
      {error && <p role="alert"><StatusBadge level="critical" label={error} /></p>}
      {draft && (
        <section aria-label="Generated draft" className="space-y-2">
          <h3 className="font-medium">
            {draft.kind === "explanation" ? "Plain-language explanation" : "Patient-reported symptom note"}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge level="info" label={`Awaiting professional review · ${draft.modality}`} />
          </div>
          {draft.kind === "symptoms" && <p>Example patient report: {demoSymptoms}</p>}
          <ul className="space-y-2">
            {draft.statements.map((statement, index) => (
              <li key={index}>
                {statement ? (
                  <>
                    <p>{statement.text}</p>
                    <blockquote className="border-l-2 border-border pl-2 text-foreground/80">{statement.sourceSpan}</blockquote>
                  </>
                ) : (
                  <StatusBadge level="warning" label="Abstained — no exact source quote was provided" />
                )}
              </li>
            ))}
          </ul>
          {draft.kind === "explanation" && (
            <div className="flex flex-wrap items-center gap-2">
              {saveState === "saved" ? (
                <StatusBadge level="stable" label="Saved to patient record" />
              ) : (
                <button
                  type="button"
                  className="rounded-md bg-accent px-3 py-2 text-accent-foreground disabled:opacity-50"
                  disabled={saveState === "saving" || !draft.rawModality}
                  onClick={() => void saveToPatientRecord()}
                >
                  Save to patient record
                </button>
              )}
              {saveError && <StatusBadge level="critical" label={saveError} />}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
