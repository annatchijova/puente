<!-- title -->

# PUENTE

**[English](README.md) · [Español](README.es.md) · [Technical README](TECHNICAL.md)**

## The problem

A doctor writes:

> *"Hemoglobin 10.2 g/dL. MCV 72 fL. Requesting iron panel to extend the
> workup."*

The patient has no idea what that means, and in three weeks will sit in
front of a different specialist who has never seen this note — because
carrying it there was the patient's job, and papers get lost. A PDF
summarizer can paraphrase the sentence. It cannot tell the patient whether
the paraphrase is actually backed by the document, and it cannot tell the
next doctor that this order ever happened.

## What PUENTE is

PUENTE is a shared clinical record for a hospital, with a translator built
into it. Every order, result, and report stays attached to the patient and
visible to whoever is treating them — nobody has to carry it between
offices. Every sentence the translator produces is tied to the exact part
of the document that justifies it. If nothing in the document justifies a
claim, PUENTE says so instead of inventing one.

## See it work

**Input** (a real-shaped doctor's note):

```
Hemoglobin 10.2 g/dL. MCV 72 fL. Requesting iron panel to extend the workup.
```

**Output** (patient-facing translation, each sentence linked to its source span):

```
Your test shows a lower amount of hemoglobin than the reference range,
and red blood cells that are smaller than usual.                [→ source: "Hemoglobin 10.2 g/dL. MCV 72 fL."]

The doctor requested additional tests to investigate the cause.  [→ source: "Requesting iron panel to extend the workup."]
```

If a generated sentence has no matching span, PUENTE marks it
**unjustified** instead of showing it as fact — abstaining is a valid
output, not a failure.

The reverse direction works too: a patient describing symptoms in plain
language gets structured into a draft note for the professional to review.
It is never auto-promoted into a diagnosis or a confirmed finding.

## Why not just summarize the PDF

| Typical PDF / chatbot summarizer | PUENTE |
|---|---|
| Explains one document in isolation | Links orders, results, reports, and reviews across specialists for the same patient |
| Can state things the source doesn't actually say | Every generated sentence cites a source span; unjustified claims are flagged, not produced |
| Patient carries the papers between doctors | The record follows the patient — no professional depends on them to relay it |
| One-way: document → explanation | Bidirectional — also structures patient-reported symptoms into a note for review |
| No record of who reviewed what | A second opinion attaches with its own authorship and timestamp, preserved alongside the original |

## How it works, briefly

- **Firebase AI Logic hybrid inference** generates the translation: Gemini
  Nano running on-device in Chrome when available, falling back to the
  Gemini Developer API in the cloud otherwise — the same feature either
  way, demonstrating both paths rather than only the cloud one.
- Every document is sealed at write time (hashed, authored, timestamped) in
  **Firestore**, so a generated sentence can always be traced back to it.
- Role-based access means a professional currently treating the patient can
  see the shared record; the patient can read their own.

Full architecture, the language decision, and the level-by-level build plan
are in the **[Technical README](TECHNICAL.md)**.

## Scope for this build

A single hospital, with fictional patients and professionals for the demo
— not an inter-institutional network. See
[`docs/levels.md`](docs/levels.md) for what each build level adds.

## Repository

```
puente/
├── web/           # Next.js app: shared record UI, translation UI, Firebase AI Logic
├── docs/          # language decision and level-by-level build plan
├── TECHNICAL.md   # architecture, data model, authority boundaries, limitations
└── LICENSE        # Apache 2.0
```

## Status

Levels 1 through 6 are built and verified end-to-end — shared record with
provenance, traceable translation, order tracking, peer review, patient
view and accessibility, and clinical observability (documentary
contradiction flagging, an explainability/provenance panel, and a
tamper-evident audit trail). See [`docs/levels.md`](docs/levels.md) for
what each level adds. Data used anywhere in this repo is fictional.

## Try it

**Live demo:** [puente-pi-mauve.vercel.app](https://puente-pi-mauve.vercel.app) —
sign in with one of the fictional demo accounts in
[`TECHNICAL.md`](TECHNICAL.md#demo-accounts) (no real patient data,
Firebase project on the free Spark plan).

To run it yourself:

```bash
cd web
npm install
cp .env.local.example .env.local   # fill in your own Firebase project config
npm run dev
```

## A note on where this stands

This has only ever been exercised against fictional patients, professionals,
and documents — never real clinical data, and never a real hospital's
workflow. Levels 1 through 6 work and are tested, but "works in this demo"
and "ready for an actual clinic" are different claims; see
[`TECHNICAL.md`](TECHNICAL.md#known-limitations--non-goals-current-state)
for what hasn't been done yet (a dedicated security/secrets review, broader
adversarial testing of the translation's source-span attribution, real
multi-institution use). There is real work ahead before this could handle
real patients.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE).
