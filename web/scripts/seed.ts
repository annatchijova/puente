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

  console.log("Seeded patient:", patientId);
  console.log("Seeded document:", docId, "sha256:", sha256);
  console.log("Treating professionals:", [cardiologist.id, neurologist.id, clinician.id]);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
