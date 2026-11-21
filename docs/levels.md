# Levels — PUENTE

Destination: an institutional continuity-of-care platform for a single
hospital (fictional patients and professionals for the demo), with
verifiable bidirectional clinical translation as its core AI function.
Built level by level per `destination-driven-construction`: each level is a
usable state of the final product, not a technical phase. Authority
boundaries (who can see/write what) exist from Level 1, not as a later
hardening pass.

If the 10-day window runs out before Level 5, stop at the highest level
reached — do not thin out all five to fit the time.

## Level 1 — Shared record with provenance

- Document ingestion (order/result/report) tied to a patient record.
- Every document carries authorship, timestamp, and a SHA-256 hash sealed
  at write time (canonical JSON, no float in the sealed payload).
- Role-based read access: any professional currently treating the patient
  sees the full document set for that patient — not siloed per specialty,
  not dependent on the patient relaying it.
- Patients and professionals are fictional seed data.
- Useful standalone: demonstrates "the patient stops being the courier"
  even with zero AI involved.

## Level 2 — Traceable clinical translation

- Firebase AI Logic hybrid inference: Gemini Nano on-device (Chrome
  Built-in AI) with fallback to Vertex AI in the cloud when on-device is
  unavailable — both paths demoable, not just the cloud one.
- Every generated sentence in the patient-facing explanation is linked to
  a specific span in the source document.
- If no source span justifies a claim, the system marks it as
  unjustified instead of generating it anyway — abstention is a valid
  output, not a failure state.
- Reverse direction: patient-reported symptoms in plain language get
  structured into a draft note for professional review — never
  auto-promoted to a diagnosis or confirmed finding.

## Level 3 — Order tracking

- Explicit state machine per order: requested → scheduled → performed →
  result received → result reviewed.
- Dashboard surfaces orders stuck in a state past an expected window —
  flagged as a gap to check, never asserted as a medical error.

## Level 4 — Peer review

- A professional can request a second opinion on a specific result from
  another authorized professional.
- The second opinion attaches to the original result with its own
  authorship and timestamp; it does not overwrite or auto-resolve against
  the first interpretation.
- Disagreements are preserved, not voted on or averaged.

## Level 5 — Patient view + accessibility

- Read-only patient view of their own longitudinal history and its
  translated explanations.
- Text-to-speech for patients who have difficulty reading clinical
  documents.
- Reinforces the Level 1 authority model: patients read their own record,
  they do not request studies or alter clinical content.

## Level 6 — Clinical observability and documentary explainability

**Priority:** low. **Depends on:** Levels 1–5, complete and verified.
**Status:** planned, non-blocking for the hackathon submission.

This level does not add automated diagnosis, clinical risk prediction, or
autonomous medical decisions. It makes the state and provenance that
Levels 1–5 already produce easier to inspect — it does not create a second
source of truth, and it does not change any validated behavior from the
levels before it.

### 6.1 Unified clinical panel

A per-patient view that reunites, from existing data and states only:

- Orders: requested, scheduled, performed, pending.
- Associated results and studies.
- Original clinical reports.
- AI-generated explanations.
- Review/approval status.
- Documentary contradictions flagged and unresolved.
- History of actions by authorized professionals.

### 6.2 Explainability and provenance

For every AI-generated claim, a professional must be able to inspect:

- The source document it came from.
- The exact span used as support.
- The document's identifier and version.
- The inference model/modality used, when available (on-device vs. cloud).
- Professional validation status.
- Corrections and observations made during review.

**Invariant:** a document reference demonstrates provenance, not semantic
correctness — tracing a claim to a span proves where it came from, not that
the claim is clinically right. A claim without sufficient support must be
marked unjustified and must not be published as validated information by
default.

Explicitly not SHAP or any predictive-model explanation method — this is
documentary traceability (claim → source span), a different problem from
explaining a predictive model's internals, and SHAP does not apply to it.

### 6.3 Audit trail

Record, at minimum: document ingestion/updates, explanation generation,
professional reviews/corrections, approvals/rejections, order/study state
changes, and relevant permission/access changes. Each event keeps author,
date, action, affected object, and a reference to the object's version at
that point.

Records must be verifiable and resistant to silent modification. Do not
call this **immutable** without an implemented mechanism that actually
backs that guarantee (e.g. hash-chaining each event to the previous one) —
per `daubert-defensible-writing`, the word is a claim, not a label.

### 6.4 Fictional demo data

The demo environment stays explicitly separate from any real institutional
environment. It uses synthetic patients, fictional professionals, and
synthetic orders/results/reviews sufficient to walk the full flow without
exposing any real personal or clinical data.

### Architectural constraints

1. Reuse Firebase, Firestore, Authentication, and the authorization
   mechanisms already built in Levels 1–5.
2. No AWS, Aurora, Cognito, or a second infrastructure stack.
3. No predictive risk models, federated learning, or clinical model
   training.
4. Clinical decisions remain the responsibility of the professional, not
   the system.
5. Per-patient and per-professional authorization enforced on every query.
6. No sensitive clinical content in operational logs beyond what's
   necessary for the audit trail itself.
7. No change to the validated behavior of Levels 1–5.

### Acceptance criteria

- An authorized professional can see a patient's full documentary state in
  one place.
- Every explanation lets a professional navigate to its source(s).
- Claims without sufficient support are correctly identified as such.
- The audit trail distinguishes generation, review, correction, and
  approval as separate event types.
- Unauthorized professionals cannot query another patient's record.
- The full demo runs end-to-end on synthetic data only.
- Automated tests exist for traceability, permissions, and the audit trail.
- No regression in any earlier level's behavior.

### Build order

Start Level 6 only after Levels 1–5 are complete and verified. It must not
delay the hackathon submission or become a dependency of PUENTE's core
behavior — its purpose is supervision and verifiability, not expanding
clinical scope.

## Per-level review

Each level gets an adversarial pass checking (a) the level itself, and (b)
that it didn't break the authority/provenance invariants established in the
levels before it — per `red-team-auditing` / `invariant-hunting`. The full
integrated test suite runs once, across whatever levels got built, not
automatically between each one.
