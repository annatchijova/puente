# PUENTE — Technical README

This is the unsoftened account: architecture, data model, authority
boundaries, design decisions, and current limitations. The primary
[README](README.md) / [README.es.md](README.es.md) are the entry point for
"what is this and why"; this document is for auditing or extending it.

## Architecture layers

Four layers, kept separate so that a change in one (e.g. swapping the LLM
backend) cannot silently change another:

| Layer | Responsibility |
|---|---|
| Documental | Store documents, versions, authorship, provenance |
| Collaborative | Permissions, consultations, comments, peer review |
| Hybrid AI | Explanations, summaries, structuring of patient input |
| Control | Verifiable rules, tracking states, audit, abstention |

The Hybrid AI layer never writes directly to a sealed document — it
produces a translation *of* an already-sealed source, and the translation
is stored beside the source, not inside it. Swapping the inference backend
(on-device Gemini Nano ↔ cloud Gemini Developer API) must change only wording, never
which source document a claim is traced to. This mirrors the same
LLM-out-of-the-decision-path discipline used in this author's other
sealed-result projects (VIGÍA, VELO): the model explains a fixed artifact,
it does not produce the artifact.

## Data model (current)

- `patients/{id}` — fictional patient record.
- `patients/{id}/documents/{docId}` — an order, result, or report. Carries
  `authorId`, `createdAt`, and a SHA-256 hash of its canonical content,
  sealed at write time.
- `patients/{id}/translations/{docId}` — generated explanation(s) for a
  document, each sentence carrying a reference to the source span it was
  derived from, or an explicit `unjustified: true` flag when no span
  supports it.
- `patients/{id}/orders/{orderId}` — state machine: `requested` →
  `scheduled` → `performed` → `result_received` → `result_reviewed`.
- `patients/{id}/reviewRequests/{requestId}` (+ nested `response/only`) —
  Level 4 peer review: a second opinion requested from a named colleague
  on a specific document, with its own `authorId`/`createdAt`. Never
  overwrites the original interpretation; patient reads are denied
  outright.
- `patients/{id}/contradictions/{contradictionId}` — Level 6.1: a
  professional manually flags two documents as contradictory; resolved
  exactly once, never reopened or edited further. No automated detection.
- `patients/{id}/auditLog/_head` + `patients/{id}/auditLog/{entryId}` —
  Level 6.3: append-only, hash-chained audit trail (`seq` strictly
  increasing from 0, each entry's hash covering the previous entry's
  hash). Verified independently by `lib/audit.ts`'s `verifyChain`, not by
  the Firestore rules themselves.

## Authority model

- A professional sees a patient's shared record only while they are listed
  as currently treating that patient. This is checked at read time, not
  granted permanently at first contact.
- A patient can read their own record and translations. A patient cannot
  create, edit, or request studies.
- A peer-review request requires both professionals to already have
  standing access to the patient; PUENTE does not grant access *because*
  a review was requested.
- None of this is implemented as a "security pass" added after the fact —
  it is part of Level 1 by construction; see `docs/levels.md`.

## Language decision

Full derivation (forces, rejected candidates, reopen condition) in
[`docs/language-decision.md`](docs/language-decision.md). Summary:
TypeScript end-to-end, because the hackathon's hybrid-inference requirement
is only exposed via the Firebase AI Logic Web SDK (Chrome Built-in AI),
which fixes the frontend as JS/TS — and no identified force justified a
second language on the backend under a 10-day window.

## Build levels

Full roadmap in [`docs/levels.md`](docs/levels.md). Each level is a usable
state of the product, not a technical phase — there is no "security level"
separate from the rest, since authority and provenance are present from
Level 1.

## Known limitations / non-goals (current state)

- No inter-institutional identity or interoperability — explicitly out of
  scope for this build; see the "Scope" note in the primary README.
- The on-device/cloud routing decision for hybrid inference is made by the
  Firebase AI Logic SDK itself; PUENTE does not currently second-guess or
  override that routing.
- Firebase App Check enforcement for `firebaseml.googleapis.com` is
  **unenforced** on this project. It defaulted to enforced when the Gemini
  Developer API was enabled, but the client never calls
  `initializeAppCheck()` — every cloud-path request failed with
  `401 UNAUTHENTICATED: Firebase App Check token is invalid` until this was
  found and disabled (2026-11-27). This was invisible during normal
  development because on-device inference never calls that endpoint at
  all; only forcing `InferenceMode.ONLY_IN_CLOUD` surfaced it. Proper fix
  for a non-demo deployment: register a reCAPTCHA v3/Enterprise provider
  and call `initializeAppCheck()` client-side, then re-enforce.
- Span-level source attribution for generated translations depends on the
  model's output including a locatable quote or offset; this has not yet
  been adversarially tested against adversarial or malformed source
  documents (planned for the Level 2 review pass).
- No real patient data exists or is used anywhere in this repository. All
  identifiers, values, and documents are fictional, generated for the
  hackathon demo.
- Firestore rules have automated test coverage for permissions,
  translation traceability, and the audit trail (`npm run test:rules`,
  see "Running tests" below), but secrets management and rate limiting
  have not had a dedicated review; this is tracked per level, not
  deferred to a single "hardening" pass at the end.

## Demo accounts

Fictional, Spark-plan email/password accounts, all with password
`puente-demo-2026`:

| Email | Role |
|---|---|
| `cardiologist@puente.demo` | Treating professional (Cardiology) |
| `neurologist@puente.demo` | Treating professional (Neurology) |
| `clinician@puente.demo` | Treating professional (Internal Medicine) |
| `patient@puente.demo` | The patient (`patient-demo-001`) |

After signing in, open `/patient/patient-demo-001` (the demo patient record).

## Deployment

The live demo is deployed on **Vercel** (`vercel --prod` from `web/`, or
automatically on push to `main` via the connected GitHub integration),
reading `NEXT_PUBLIC_FIREBASE_*` as public Config-type environment
variables — these are Firebase's public web-app identifiers, not secrets;
access control is enforced by Firestore rules and Auth, not by hiding
them. Firebase itself (Firestore, Auth, AI Logic) stays on the Spark
(free) plan; only the Next.js frontend is hosted on Vercel; Firebase App
Hosting was considered first but requires the paid Blaze plan.
`web/.npmrc` sets `legacy-peer-deps=true` — required for `npm install` to
resolve `@firebase/rules-unit-testing` and `vitest`'s peer dependencies
against `firebase@13`; without it, both local installs and Vercel's build
fail.

## Running tests

Firestore rules tests (authority boundaries, translation traceability, the
Level 6.3 audit trail) run against the local Firestore emulator — they
never touch the real `puente-hackathon-36b4a` project:

```
cd web
npm run test:rules
```

Requires Java (for the emulator) and `firebase-tools` (installed as a dev
dependency). `firebase.json` pins the emulator to port 8089 — 8080 is
commonly held by other local services on this machine (open-webui).

## Repository tree

```
puente/
├── web/
│   ├── src/app/           # Next.js App Router pages
│   ├── src/lib/firebase.ts  # Firebase client init (env-driven, no secrets committed)
│   ├── tests/             # Firestore rules test suite (npm run test:rules)
│   └── .env.local.example   # required Firebase project variables
├── docs/
│   ├── language-decision.md  # full language decision record
│   └── levels.md              # full level-by-level build plan
├── README.md / README.es.md  # primary, human-facing
├── TECHNICAL.md               # this file
└── LICENSE                    # Apache 2.0
```
