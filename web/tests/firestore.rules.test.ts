// Firestore rules tests for the Level 1 authority model, Level 2
// translation traceability, and the Level 6.3 audit trail. Run against
// the local Firestore emulator — these never touch the real project.
//
//   npm run test:rules
//
// (requires the Firebase emulator, which requires Java — already
// verified present on this machine.)
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { serverTimestamp } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const PROJECT_ID = "puente-rules-test";
const PATIENT_A = "patient-a";
const PATIENT_B = "patient-b";
const DOC_PROFESSIONAL = "prof-cardio";
const OTHER_PROFESSIONAL = "prof-not-treating";
const DOCUMENT_ID = "doc-cbc-001";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, "../firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Seed fixture state bypassing rules: patient A, a treating professional,
  // and one sealed document — the baseline every test builds on.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await db.doc(`patients/${PATIENT_A}`).set({ displayName: "Patient A", dateOfBirth: "1990-01-01" });
    await db.doc(`patients/${PATIENT_A}/treatingProfessionals/${DOC_PROFESSIONAL}`).set({
      professionalId: DOC_PROFESSIONAL, displayName: "Dr. Cardio", specialty: "Cardiology", addedAt: "2026-01-01T00:00:00Z",
    });
    await db.doc(`patients/${PATIENT_A}/documents/${DOCUMENT_ID}`).set({
      id: DOCUMENT_ID, kind: "result", authorId: DOC_PROFESSIONAL,
      createdAt: "2026-01-01T00:00:00Z", content: "Hemoglobin 10.2 g/dL.", sha256: "a".repeat(64),
    });
    await db.doc(`patients/${PATIENT_B}`).set({ displayName: "Patient B", dateOfBirth: "1991-01-01" });
  });
});

function asProfessional() {
  return testEnv.authenticatedContext(DOC_PROFESSIONAL).firestore();
}
function asOtherProfessional() {
  return testEnv.authenticatedContext(OTHER_PROFESSIONAL).firestore();
}
function asPatientA() {
  return testEnv.authenticatedContext(PATIENT_A).firestore();
}
function asPatientB() {
  return testEnv.authenticatedContext(PATIENT_B).firestore();
}
function asAnonymous() {
  return testEnv.unauthenticatedContext().firestore();
}

describe("Permissions — Level 1 authority model", () => {
  it("lets the treating professional read the patient's document", async () => {
    await assertSucceeds(asProfessional().doc(`patients/${PATIENT_A}/documents/${DOCUMENT_ID}`).get());
  });

  it("lets the patient read their own document", async () => {
    await assertSucceeds(asPatientA().doc(`patients/${PATIENT_A}/documents/${DOCUMENT_ID}`).get());
  });

  it("denies a professional not listed as treating this patient", async () => {
    await assertFails(asOtherProfessional().doc(`patients/${PATIENT_A}/documents/${DOCUMENT_ID}`).get());
  });

  it("denies a different patient reading patient A's document", async () => {
    await assertFails(asPatientB().doc(`patients/${PATIENT_A}/documents/${DOCUMENT_ID}`).get());
  });

  it("denies an unauthenticated reader entirely", async () => {
    await assertFails(asAnonymous().doc(`patients/${PATIENT_A}/documents/${DOCUMENT_ID}`).get());
  });

  it("denies the patient creating a document — only a treating professional seals one", async () => {
    await assertFails(
      asPatientA().doc(`patients/${PATIENT_A}/documents/doc-patient-attempt`).set({
        id: "doc-patient-attempt", kind: "result", authorId: PATIENT_A,
        createdAt: "2026-01-01T00:00:00Z", content: "x", sha256: "b".repeat(64),
      }),
    );
  });

  it("lets a treating professional seal a new document — the DocumentUpload.tsx path", async () => {
    await assertSucceeds(
      asProfessional().doc(`patients/${PATIENT_A}/documents/doc-new-001`).set({
        id: "doc-new-001", kind: "result", authorId: DOC_PROFESSIONAL,
        createdAt: "2026-01-01T00:00:00Z", content: "Lipid panel: LDL 142 mg/dL.", sha256: "c".repeat(64),
      }),
    );
  });

  it("denies a professional sealing a document under someone else's authorship", async () => {
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/documents/doc-spoofed-001`).set({
        id: "doc-spoofed-001", kind: "result", authorId: OTHER_PROFESSIONAL,
        createdAt: "2026-01-01T00:00:00Z", content: "x", sha256: "d".repeat(64),
      }),
    );
  });

  it("denies reviewRequests reads to the patient — unlike the generic /reviews path, second opinions stay within the treating team", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`patients/${PATIENT_A}/reviewRequests/req-1`).set({
        documentId: DOCUMENT_ID, resultDigest: "a".repeat(64),
        requesterId: DOC_PROFESSIONAL, assigneeId: DOC_PROFESSIONAL, createdAt: new Date(),
      });
    });
    await assertFails(asPatientA().doc(`patients/${PATIENT_A}/reviewRequests/req-1`).get());
    await assertSucceeds(asProfessional().doc(`patients/${PATIENT_A}/reviewRequests/req-1`).get());
  });
});

describe("Traceability — Level 2 translations", () => {
  const validSentences = [{ text: "Low hemoglobin.", sourceSpan: "Hemoglobin 10.2 g/dL.", unjustified: false }];

  it("lets a treating professional save a translation of an existing document", async () => {
    await assertSucceeds(
      asProfessional().doc(`patients/${PATIENT_A}/translations/${DOCUMENT_ID}`).set({
        documentId: DOCUMENT_ID, sentences: validSentences,
        generatedAt: serverTimestamp(), generatedBy: DOC_PROFESSIONAL, modality: "cloud",
      }),
    );
  });

  it("denies a translation for a document that doesn't exist — nothing to trace to", async () => {
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/translations/doc-does-not-exist`).set({
        documentId: "doc-does-not-exist", sentences: validSentences,
        generatedAt: serverTimestamp(), generatedBy: DOC_PROFESSIONAL, modality: "cloud",
      }),
    );
  });

  it("denies a translation whose generatedBy doesn't match the authenticated writer", async () => {
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/translations/${DOCUMENT_ID}`).set({
        documentId: DOCUMENT_ID, sentences: validSentences,
        generatedAt: serverTimestamp(), generatedBy: OTHER_PROFESSIONAL, modality: "cloud",
      }),
    );
  });

  it("denies a non-treating professional saving a translation", async () => {
    await assertFails(
      asOtherProfessional().doc(`patients/${PATIENT_A}/translations/${DOCUMENT_ID}`).set({
        documentId: DOCUMENT_ID, sentences: validSentences,
        generatedAt: serverTimestamp(), generatedBy: OTHER_PROFESSIONAL, modality: "cloud",
      }),
    );
  });

  it("denies overwriting an already-saved translation — it's the record of what was reviewed, not an editable draft", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`patients/${PATIENT_A}/translations/${DOCUMENT_ID}`).set({
        documentId: DOCUMENT_ID, sentences: validSentences,
        generatedAt: serverTimestamp(), generatedBy: DOC_PROFESSIONAL, modality: "cloud",
      });
    });
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/translations/${DOCUMENT_ID}`).set({
        documentId: DOCUMENT_ID, sentences: [{ text: "Different.", sourceSpan: null, unjustified: true }],
        generatedAt: serverTimestamp(), generatedBy: DOC_PROFESSIONAL, modality: "on-device",
      }),
    );
  });
});

describe("Audit trail — Level 6.3 append-only hash chain", () => {
  it("accepts the first entry only at seq 0", async () => {
    await assertSucceeds(
      asProfessional().doc(`patients/${PATIENT_A}/auditLog/_head`).set({ seq: 0, entryHash: "a".repeat(64) }),
    );
  });

  it("rejects a head write that doesn't start the chain at 0", async () => {
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/auditLog/_head`).set({ seq: 5, entryHash: "a".repeat(64) }),
    );
  });

  it("advances the head by exactly one seq per write, never skipping", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`patients/${PATIENT_A}/auditLog/_head`).set({ seq: 0, entryHash: "a".repeat(64) });
    });
    await assertSucceeds(
      asProfessional().doc(`patients/${PATIENT_A}/auditLog/_head`).set({ seq: 1, entryHash: "b".repeat(64) }),
    );
  });

  it("rejects a head update that skips a sequence number", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc(`patients/${PATIENT_A}/auditLog/_head`).set({ seq: 0, entryHash: "a".repeat(64) });
    });
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/auditLog/_head`).set({ seq: 2, entryHash: "c".repeat(64) }),
    );
  });

  it("lets a treating professional append a well-formed entry", async () => {
    await assertSucceeds(
      asProfessional().collection(`patients/${PATIENT_A}/auditLog`).add({
        seq: 0, type: "document_sealed", actor: DOC_PROFESSIONAL, objectId: DOCUMENT_ID,
        summary: "Document sealed", at: new Date().toISOString(), previousHash: null,
        entryHash: "a".repeat(64), recordedAt: new Date(),
      }),
    );
  });

  it("denies a non-treating professional from appending an entry for this patient", async () => {
    await assertFails(
      asOtherProfessional().collection(`patients/${PATIENT_A}/auditLog`).add({
        seq: 0, type: "document_sealed", actor: OTHER_PROFESSIONAL, objectId: DOCUMENT_ID,
        summary: "Forged entry", at: new Date().toISOString(), previousHash: null,
        entryHash: "a".repeat(64), recordedAt: new Date(),
      }),
    );
  });

  it("denies an entry whose actor doesn't match the authenticated writer — no attributing an action to someone else", async () => {
    await assertFails(
      asProfessional().collection(`patients/${PATIENT_A}/auditLog`).add({
        seq: 0, type: "document_sealed", actor: OTHER_PROFESSIONAL, objectId: DOCUMENT_ID,
        summary: "Mislabeled actor", at: new Date().toISOString(), previousHash: null,
        entryHash: "a".repeat(64), recordedAt: new Date(),
      }),
    );
  });

  it("denies editing an existing audit entry — append-only means append-only", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const ref = await context.firestore().collection(`patients/${PATIENT_A}/auditLog`).add({
        seq: 0, type: "document_sealed", actor: DOC_PROFESSIONAL, objectId: DOCUMENT_ID,
        summary: "Document sealed", at: new Date().toISOString(), previousHash: null,
        entryHash: "a".repeat(64), recordedAt: new Date(),
      });
      entryId = ref.id;
    });
    await assertFails(
      asProfessional().doc(`patients/${PATIENT_A}/auditLog/${entryId}`).update({ summary: "Rewritten after the fact" }),
    );
  });

  it("denies deleting an audit entry", async () => {
    let entryId = "";
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const ref = await context.firestore().collection(`patients/${PATIENT_A}/auditLog`).add({
        seq: 0, type: "document_sealed", actor: DOC_PROFESSIONAL, objectId: DOCUMENT_ID,
        summary: "Document sealed", at: new Date().toISOString(), previousHash: null,
        entryHash: "a".repeat(64), recordedAt: new Date(),
      });
      entryId = ref.id;
    });
    await assertFails(asProfessional().doc(`patients/${PATIENT_A}/auditLog/${entryId}`).delete());
  });
});

describe("sanity", () => {
  it("the fixture patient exists so other suites aren't silently testing against nothing", async () => {
    let exists = false;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const snap = await context.firestore().doc(`patients/${PATIENT_A}`).get();
      exists = snap.exists;
    });
    expect(exists).toBe(true);
  });
});
