/**
 * Fictional Level-1 seed data for PUENTE.
 * Uses the Admin SDK (bypasses Firestore security rules), run once from a
 * trusted environment — this is exactly the kind of write (granting
 * treatingProfessionals membership) that firestore.rules deliberately
 * forbids from the client.
 *
 * Usage: npx tsx scripts/seed.ts
 * Requires: gcloud application-default credentials for a principal with
 * write access to the puente-hackathon-36b4a Firestore database.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";

initializeApp({
  credential: applicationDefault(),
  projectId: "puente-hackathon-36b4a",
});

const db = getFirestore();

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    sorted[key] = canonicalize((value as Record<string, unknown>)[key]);
  }
  return sorted;
}

function seal(content: {
  kind: string;
  authorId: string;
  createdAt: string;
  content: string;
}): string {
  const canonical = JSON.stringify(canonicalize(content));
  return createHash("sha256").update(canonical).digest("hex");
}

async function main() {
  const now = new Date().toISOString();

  // Fictional professionals (not real credentials — demo-only).
  const cardiologist = { id: "prof-cardio-001", displayName: "Dr. Marta Ibáñez", specialty: "Cardiology" };
  const neurologist = { id: "prof-neuro-001", displayName: "Dr. Lucas Ferreyra", specialty: "Neurology" };
  const clinician = { id: "prof-clinic-001", displayName: "Dr. Sofía Gómez", specialty: "Internal Medicine" };

  // One fictional patient treated by all three.
  const patientId = "patient-demo-001";
  await db.doc(`patients/${patientId}`).set({
    id: patientId,
    displayName: "Patient Demo One",
    dateOfBirth: "1986-04-12",
  });

  for (const prof of [cardiologist, neurologist, clinician]) {
    await db.doc(`patients/${patientId}/treatingProfessionals/${prof.id}`).set({
      professionalId: prof.id,
      displayName: prof.displayName,
      specialty: prof.specialty,
      addedAt: now,
    });
  }

  // The hemoglobin example from the README, sealed as a clinical document.
  const docId = "doc-cbc-001";
  const content =
    "Hemoglobin 10.2 g/dL. MCV 72 fL. Requesting iron panel to extend the workup.";
  const createdAt = now;
  const authorId = clinician.id;
  const sha256 = seal({ kind: "result", authorId, createdAt, content });

  await db.doc(`patients/${patientId}/documents/${docId}`).set({
    id: docId,
    kind: "result",
    authorId,
    createdAt,
    content,
    sha256,
  });

  // A second fictional result, deliberately in tension with the first —
  // anemia is suspected above, but the follow-up iron studies come back
  // normal. This is exactly the kind of documentary tension Level 6.1's
  // contradiction-flagging feature exists to surface, not resolve.
  const ironDocId = "doc-iron-001";
  const ironContent =
    "Iron panel: ferritin 180 ng/mL, transferrin saturation 35%. Iron stores within normal range.";
  const ironCreatedAt = now;
  const ironSha256 = seal({ kind: "result", authorId, createdAt: ironCreatedAt, content: ironContent });

  await db.doc(`patients/${patientId}/documents/${ironDocId}`).set({
    id: ironDocId,
    kind: "result",
    authorId,
    createdAt: ironCreatedAt,
    content: ironContent,
    sha256: ironSha256,
  });

  console.log("Seeded patient:", patientId);
  console.log("Seeded document:", docId, "sha256:", sha256);
  console.log("Seeded document:", ironDocId, "sha256:", ironSha256);
  console.log("Treating professionals:", [cardiologist.id, neurologist.id, clinician.id]);

  // Second demo case — deliberately different shape from patient-demo-001:
  // an order -> report pair (not two results in tension), a translation
  // seeded directly as data (the live on-device/cloud draft generator in
  // TraceableDraft.tsx is wired to one fixed document for the demo, not
  // every document), a resolved second opinion, and an overdue order — so
  // the demo has more than one documentary shape and more than one order/
  // review state to show.
  const patientId2 = "patient-demo-002";
  await db.doc(`patients/${patientId2}`).set({
    id: patientId2,
    displayName: "Patient Demo Two",
    dateOfBirth: "1973-09-02",
  });

  for (const prof of [cardiologist, neurologist, clinician]) {
    await db.doc(`patients/${patientId2}/treatingProfessionals/${prof.id}`).set({
      professionalId: prof.id,
      displayName: prof.displayName,
      specialty: prof.specialty,
      addedAt: now,
    });
  }

  const orderDocId = "doc-cxr-order-001";
  const orderDocContent = "Chest X-ray requested to evaluate three weeks of persistent cough.";
  const orderDocCreatedAt = now;
  const orderDocSha256 = seal({
    kind: "order", authorId: clinician.id, createdAt: orderDocCreatedAt, content: orderDocContent,
  });
  await db.doc(`patients/${patientId2}/documents/${orderDocId}`).set({
    id: orderDocId, kind: "order", authorId: clinician.id,
    createdAt: orderDocCreatedAt, content: orderDocContent, sha256: orderDocSha256,
  });

  // kind: "result" (not "report") — Level 4 peer review (PeerReview.tsx) is
  // scoped to result documents only, and a radiology report is exactly the
  // result of the imaging order above.
  const reportDocId = "doc-cxr-report-001";
  const reportDocContent =
    "Chest X-ray: no acute infiltrate. Mild bibasilar atelectasis, likely positional. No pleural effusion.";
  const reportDocCreatedAt = now;
  const reportDocSha256 = seal({
    kind: "result", authorId: clinician.id, createdAt: reportDocCreatedAt, content: reportDocContent,
  });
  await db.doc(`patients/${patientId2}/documents/${reportDocId}`).set({
    id: reportDocId, kind: "result", authorId: clinician.id,
    createdAt: reportDocCreatedAt, content: reportDocContent, sha256: reportDocSha256,
  });

  // Translation seeded as data — cloud modality, to show the other half of
  // the hybrid pair next to patient-demo-001's on-device example.
  await db.doc(`patients/${patientId2}/translations/${reportDocId}`).set({
    documentId: reportDocId,
    sentences: [
      {
        text: "The chest X-ray did not show any new infection.",
        sourceSpan: "no acute infiltrate",
        unjustified: false,
      },
      {
        text: "There's a small area of partially collapsed lung tissue at the base, most likely just from body position during the X-ray, not a sign of disease.",
        sourceSpan: "Mild bibasilar atelectasis, likely positional",
        unjustified: false,
      },
      {
        text: "There is no fluid around the lungs.",
        sourceSpan: "No pleural effusion",
        unjustified: false,
      },
    ],
    generatedAt: Timestamp.fromDate(new Date(now)),
    generatedBy: clinician.id,
    modality: "cloud",
  });

  // An order stuck in "requested" past its demo deadline (48h) — exercises
  // the overdue-order warning badge on the shared record page.
  const overdueRequestedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  await db.doc(`patients/${patientId2}/orders/order-cxr-001`).set({
    description: "Chest X-ray",
    state: "requested",
    requestedBy: clinician.id,
    requestedAt: Timestamp.fromDate(overdueRequestedAt),
    transitions: {
      requested: { at: Timestamp.fromDate(overdueRequestedAt), by: clinician.id },
    },
  });

  // A second opinion already answered — contrasts with patient-demo-001's
  // still-open request, so both review states are visible in the demo.
  const reviewRequestRef = db.doc(`patients/${patientId2}/reviewRequests/review-cxr-001`);
  await reviewRequestRef.set({
    documentId: reportDocId,
    resultDigest: reportDocSha256,
    requesterId: clinician.id,
    assigneeId: cardiologist.id,
    createdAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
  });
  await reviewRequestRef.collection("response").doc("only").set({
    authorId: cardiologist.id,
    note: "Agree — findings are non-specific and consistent with positional atelectasis. No further imaging needed at this time.",
    createdAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
  });

  console.log("Seeded patient:", patientId2);
  console.log("Seeded document:", orderDocId, "sha256:", orderDocSha256);
  console.log("Seeded document:", reportDocId, "sha256:", reportDocSha256);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
