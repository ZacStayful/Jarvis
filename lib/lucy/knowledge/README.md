# Lucy voice knowledge base

Reference text files used to seed the Retell voice agent's knowledge base.
Each subdirectory mirrors the original knowledge collection from the
stayful-voice-api source:

- `faq/` — frequently asked questions Lucy uses to handle objections.
- `extended-profile-intelligence/` — extra context about lead segments.
- `identity-disclosure/` — what Lucy says when asked if she's an AI.
- `purchase-lead-locations/` — geographic / coverage edge cases.

These files are not imported by any route at runtime — Retell loads them
directly from its dashboard. They live in the repo so the knowledge base
is versioned alongside the code that depends on it.

If you change a file here, also update the corresponding entry in the
Retell agent (agent_82f187b32e8f5e7913da1c506f) — there's no auto-sync.
A new file (no legacy hash name) has no Retell entry yet, so upload it
as a new knowledge document. Pending sync:

- `faq/web-meeting-faq.txt` — re-upload (fixed the six-month-term
  framing, enriched dynamic pricing, added "managing remotely" and
  "owner access with 72-hour notice").
- `extended-profile-intelligence/existing-stl-competitor-switch.txt` —
  new document, upload to the agent.
