# 0025. Calling feature: three daily calls, phone controls the app (supersedes ADR 0022 point 2)

Status: Accepted (Jonas, 2026-10-30)
Date: 2026-10-30
Deciders: Jonas (Jack to redraw the page)

## Context
The student had one call time (Profile > Phone call, ADR 0022). Jonas wants Morning, Midday and Night calls, calls when a
task starts, and Claude on the phone (outbound and inbound) that can start the timer and add tasks in the app.
Plan: docs/plans/calling-feature.md.

## Decision
- Three fixed calls: `morning`, `midday`, `night`. Each has its own time and on/off switch (`callSlots` on the student).
  Old records keep `callTime` as the morning call; midday and night start switched off.
- The night call may be after 21:00. ADR 0008's 08:00 to 21:00 window belonged to the Python backend; the Node
  scheduler has none. Legal check before real users, as in docs/plans/call-feature.md.
- "Calling feature" becomes a top-level sidebar entry; the Phone call page moves there (later PR). All text on it is marked AI generated.
- The phone talks to the app through a small command queue on the server (later PR); inbound calls use the same tools.
- Built in separate pull requests: slots, command queue and tools, page and sidebar, inbound.

## Consequences
- Good: students choose their rhythm; nobody loses an existing morning call.
- Harder: up to three calls a day cost more; the existing per-day call counter stays the brake.
- The Cartesia agent receives `call_kind` (morning, midday, night) as a dynamic variable; midday and night calls open with
  their own line. The agent prompt can use `call_kind` later.
