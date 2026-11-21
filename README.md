# PUENTE

> Léelo en [español](README.es.md).

Institutional platform for continuity of care: verifiable bidirectional
clinical translation, a shared record across the professionals treating the
same patient, and peer review — built for the
[Firebase Hybrid AI Hackathon](https://firebasehybridaihackathon.devpost.com/rules).

The patient stops being responsible for carrying orders, results, and
reports between offices. Every claim an AI generates is traceable to a
specific fragment of the source document; if the system cannot justify an
explanation, it flags that instead of inventing one.

Scope chosen: a **single-institution internal system** (one hospital, with
fictional patients and professionals for the demo), not an
inter-institutional network. That choice is revisitable later if the
identity/interoperability problem across institutions becomes tractable.

## Why "hybrid AI" and not a PDF summarizer

A PDF reader explains one isolated document. PUENTE links orders, results,
reports, and reviews from different professionals within an institution,
keeps the history, and uses **Firebase AI Logic hybrid inference** (Gemini
Nano on-device via Chrome Built-in AI, falling back to Vertex AI in the
cloud) to generate the translations — explicitly demonstrating the local
processing and cloud transition the hackathon requires, not just "Gemini
summarizes a PDF."

## Language decision

See [`docs/language-decision.md`](docs/language-decision.md) for the full
record (forces, rejected candidates, reopen condition).

Summary: **TypeScript end-to-end** — Next.js (App Router) + Firebase
Functions 2nd gen + Firestore + the Firebase AI Logic Web SDK. The
hackathon's hybrid inference only exists today through the web SDK (Chrome
Built-in AI), which fixes the frontend as JS/TS; adding a second language on
the backend would not remove any real boundary and costs time there isn't
in 10 days.

## Levels

See [`docs/levels.md`](docs/levels.md). Built level by level: each level is
a coherent, usable state of the product, not an isolated technical layer
(there is no separate "security level" — roles and authorship exist from
Level 1).

1. Shared record with provenance
2. Traceable clinical translation
3. Order tracking
4. Peer review
5. Patient view + accessibility

## Data

All patients, professionals, orders, and results used in the demo are
fictional, generated for this project.

## License

Apache License 2.0 — see [`LICENSE`](LICENSE).
