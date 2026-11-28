# Language decision — PUENTE

Problem shape: web application (document store + role-based collaboration +
on-device/cloud LLM inference). Not relational-heavy, not numerically
intensive, not systems-level.

Language imposed?: partially — the hackathon's hybrid inference requirement
(on-device Gemini Nano + cloud Gemini Developer API fallback) is only exposed today
through the **Firebase AI Logic Web SDK**, which runs on Chrome's Built-in AI.
There is no equivalent client SDK for Python, Go, or JVM languages. This fixes
the frontend as JavaScript/TypeScript regardless of any other preference.

Decisive forces:
- Hybrid inference client requirement → JS/TS on the frontend (Chrome
  Built-in AI, no alternative SDK).
- Provenance sealing (every generated claim traceable to a source span,
  hashed with authorship/timestamp) → needs canonical serialization, no
  float in the sealed path — but the actual computation here is near-zero
  arithmetic (lab values are stored as exact strings, not aggregated), so
  this force is weak, not a hard constraint on the backend language.
- 10-day hackathon window → every additional language boundary (FFI, second
  toolchain, second deploy target) costs time with no corresponding benefit
  if nothing requires it.
- Firestore is already the interface between any backend logic and the
  frontend (documents in, sealed documents out) — a backend in a different
  language from the frontend buys nothing structural, since the boundary
  already exists at the database, not at an RPC layer.

Candidates surfaced:
- **TypeScript (Next.js + Firebase Functions 2nd gen)** — entered because it
  removes the client-side imposition entirely and extends it to the backend,
  letting document schemas be shared as TypeScript types across client and
  function, caught at compile time instead of at runtime.
- **Python (Firebase Functions 2nd gen supports Python 3.12)** — entered
  because it's the established pattern in this author's other sealed/forensic
  projects (VIGÍA, VELO): native `Fraction`, native `hashlib`, SHA-256 sealing
  already written and trusted.
- **Go (Firebase Functions 2nd gen / Cloud Run)** — entered because it's a
  reasonable default for I/O-bound backend services with good concurrency
  and a single static binary.

Chosen: **TypeScript end-to-end** — Next.js (App Router) for the frontend,
Firestore for the document store, Firebase AI Logic Web SDK for hybrid
inference.

Update: the as-built system has no Cloud Functions at all, not even
Node.js/TypeScript ones — every write goes directly from the client SDK to
Firestore, authorized by `firestore.rules` (see TECHNICAL.md's Authority
model and Data model sections). The "Firebase Functions 2nd gen" line in
the original decision below was the plan going in; it turned out nothing
in Levels 1-6 actually needed a trusted-server step that Firestore rules
couldn't express (document sealing happens client-side before write, and
the rules verify the shape/hash, not a server recomputing it) — so the
second toolchain this decision already argued against opening never got
opened for backend logic either. Seed scripts (`web/scripts/`) use the
Admin SDK for one-off fictional-data writes outside the deployed app, not
a runtime backend.

Why TypeScript end-to-end: the client-side force is non-negotiable (hybrid
inference = Chrome Built-in AI = JS/TS), and no force identified for a
backend was strong enough to justify opening a second language boundary
under a 10-day window. Firestore already serves as the shared interface; a
second language would add a toolchain and a deploy target without removing
any actual coupling.

Guarantees we're relying on:
- Compile-time type checking across client/server — provided by TypeScript's
  compiler, shared via a single `types/` package.
- SHA-256 sealing of provenance claims — provided by Node's `crypto` module,
  not by the language itself.
- Exact arithmetic where it matters — provided by storing lab values as exact
  decimal strings or `BigInt`-backed representations, not IEEE-754 `number`;
  no ratio/aggregation computation exists in the current architecture that
  would need `Fraction`-style exact rational arithmetic. If one is introduced
  later (e.g. a trend/delta calculation across results), it must go through
  an exact-arithmetic library (e.g. `decimal.js`), never a bare `number`.

Guarantees we're NOT getting:
- No native arbitrary-precision rational type (unlike Python's `fractions`).
  Mitigation above. Revisit if a computed ratio enters the sealed path.
- JS `number` is IEEE-754 double by default — every value that reaches the
  sealed provenance record must be explicitly routed through an exact
  representation at the point it's written, not assumed safe by the language.

Rejected:
- Python — lost on: the frontend is fixed as TS regardless, so a Python
  backend buys no reduction in actual language count, only an added one.
  Strongest argument for it: native `Fraction`/`hashlib` matching the
  author's existing sealed-result pattern in VIGÍA/VELO — would have been a
  near-zero-cost reuse of already-trusted code if the frontend weren't
  already forcing TS.
- Go — lost on: no benefit specific to this I/O-bound, document-CRUD-shaped
  backend; adds a language boundary for no identified force. Strongest
  argument for it: a single static binary and no GC pause, irrelevant at
  this scale and request pattern.

Accepted cost: exact arithmetic in the sealed path must be deliberately
enforced at each write site (code review discipline), rather than coming for
free from the language's standard library.

Verification plan: TypeScript compiler (`strict` mode) across the shared
`types/` package; a unit test asserting the canonical-serialization +
SHA-256 seal is bit-identical across two independent runs with reordered
input keys (per the determinism check in `deterministic-core`).

Boundaries (if split): none — single language, single toolchain. Firestore
is the sole shared interface between any two components, not a language
boundary.

Reopen if: a computation is introduced that requires real rational
arithmetic (trend/delta across lab results, a weighted score, anything summed
across records) and the team judges `decimal.js`/manual `BigInt` ratios too
error-prone at that point — at which point an isolated Python or Rust service
behind Firestore becomes worth pricing again.
