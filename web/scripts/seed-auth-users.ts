/**
 * Creates fictional Auth users matching the UIDs already granted Firestore
 * access in scripts/seed.ts, so the demo's email/password sign-in actually
 * resolves to a professional (or patient) with real access.
 *
 * Usage: GOOGLE_APPLICATION_CREDENTIALS=<key> npx tsx scripts/seed-auth-users.ts
 * Demo passwords only — not meant to survive past the hackathon demo.
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

initializeApp({
  credential: applicationDefault(),
  projectId: "puente-hackathon-36b4a",
});

const auth = getAuth();

const DEMO_PASSWORD = "puente-demo-2026";

const users = [
  { uid: "prof-cardio-001", email: "cardiologist@puente.demo", displayName: "Dr. Marta Ibáñez" },
  { uid: "prof-neuro-001", email: "neurologist@puente.demo", displayName: "Dr. Lucas Ferreyra" },
  { uid: "prof-clinic-001", email: "clinician@puente.demo", displayName: "Dr. Sofía Gómez" },
  { uid: "patient-demo-001", email: "patient@puente.demo", displayName: "Patient Demo One" },
  { uid: "patient-demo-002", email: "patient2@puente.demo", displayName: "Patient Demo Two" },
];

async function main() {
  for (const u of users) {
    try {
      await auth.createUser({
        uid: u.uid,
        email: u.email,
        password: DEMO_PASSWORD,
        displayName: u.displayName,
      });
      console.log("Created:", u.email);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/uid-already-exists" || code === "auth/email-already-exists") {
        console.log("Already exists, skipping:", u.email);
      } else {
        throw err;
      }
    }
  }
  console.log("\nDemo password for all accounts:", DEMO_PASSWORD);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
