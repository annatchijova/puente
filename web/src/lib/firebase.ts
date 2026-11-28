import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Firebase AI Logic requires App Check (the Firebase Hybrid AI Hackathon
// rules say so explicitly, and explicitly accept a debug token in
// submissions instead of a production attestation provider like
// reCAPTCHA). A debug token registered for this app in the Firebase
// console is embedded here — fine for a public fictional-data demo, not
// a secret. Client-only: initializeAppCheck touches `self`/`window` and
// must not run during Next.js's server-side build/render.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN) {
  (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string }).FIREBASE_APPCHECK_DEBUG_TOKEN =
    process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  initializeAppCheck(app, {
    // Unused while FIREBASE_APPCHECK_DEBUG_TOKEN is set — the SDK uses the
    // debug provider instead — but initializeAppCheck still requires a
    // syntactically valid provider argument.
    provider: new ReCaptchaV3Provider("unused-in-debug-mode"),
    isTokenAutoRefreshEnabled: true,
  });
}
