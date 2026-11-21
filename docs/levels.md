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

## Level 1 — Expediente compartido con procedencia

- Document ingestion (order/result/report) tied to a patient record.
- Every document carries authorship, timestamp, and a SHA-256 hash sealed
  at write time (canonical JSON, no float in the sealed payload).
- Role-based read access: any professional currently treating the patient
  sees the full document set for that patient — not siloed per specialty,
  not dependent on the patient relaying it.
- Patients and professionals are fictional seed data.
- Useful standalone: demonstrates "the patient stops being the courier"
  even with zero AI involved.

## Level 2 — Traducción clínica trazable

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

## Level 3 — Seguimiento de órdenes

- Explicit state machine per order: solicitado → programado → realizado →
  resultado recibido → resultado revisado.
- Dashboard surfaces orders stuck in a state past an expected window —
  flagged as a gap to check, never asserted as a medical error.

## Level 4 — Revisión entre pares

- A professional can request a second opinion on a specific result from
  another authorized professional.
- The second opinion attaches to the original result with its own
  authorship and timestamp; it does not overwrite or auto-resolve against
  the first interpretation.
- Disagreements are preserved, not voted on or averaged.

## Level 5 — Vista paciente + accesibilidad

- Read-only patient view of their own longitudinal history and its
  translated explanations.
- Text-to-speech for patients who have difficulty reading clinical
  documents.
- Reinforces the Level 1 authority model: patients read their own record,
  they do not request studies or alter clinical content.

## Per-level review

Each level gets an adversarial pass checking (a) the level itself, and (b)
that it didn't break the authority/provenance invariants established in the
levels before it — per `red-team-auditing` / `invariant-hunting`. The full
integrated test suite runs once, across whatever levels got built, not
automatically between each one.
