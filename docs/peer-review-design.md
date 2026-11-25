# Level 4 peer review design

A treating professional requests a second opinion on a verified result from a
different professional on the same patient's care team. The request records
the patient scope, result identifier and verified digest, requester, assignee,
and server creation time. Keep the original result and any existing
interpretation intact.

The assigned professional can add one response to the request while still
authorized for that patient. The response records its author and server
submission time. Store it at a fixed path under the request so a retry or two
simultaneous submissions cannot create a second response. A response closes
only its own request by its presence. Multiple requests and their responses can
coexist, including opinions that disagree.

## Authorization and provenance

- Keep requests and unreviewed responses within the treating team. The current
  generic reviews rule also permits patient reads and does not enforce assignment.
  Use a separate path and explicit rules for the new workflow.
- Check current requester and assignee membership when the request is created.
  At submission, check the assigned identity and current membership. Use
  server timestamps and prevent edits and deletes through the client.
- A stored digest can identify the exact reviewed version once its provenance
  has been established. Comparing it with a client-declared hash alone leaves
  the provenance question open. Scope every reference to the same patient's
  verified result.
- Tie record state to the signed-in user and patient. Recheck membership before
  rendering a result or opening its review workflow in a new session.

## Integration acceptance checks

1. A treating professional can assign a verified result to another current
   treating professional. Requests for a different patient's result or an
   unverified result are rejected.
2. The assignee can submit once. The requester, unrelated professionals, former
   team members, and patients cannot submit on the assignee's behalf.
3. After changing patient or signing in as a different user, the view discards
   the previous scope before rendering any result or review.
4. A second opinion leaves the original result and existing opinions unchanged.
   Duplicate submission attempts produce a single response.

The live workflow depends on session-scoped record reads and a verified source
document path. Exercise those prerequisites before wiring the review UI to
Firestore.
