# 0006. Remove the empty `Sound` placeholder from the focus code

Status: Proposed (accepted when the pull request is merged)
Date: 2026-10-20
Deciders: Jonas, Jack
Refines: 0001 (frontend stays unchanged)

## Context
The focus code had a `Sound` object whose functions do nothing
(`available` is always false, `start`/`stop`/`prime` are empty). Six places
called it, including `syncSound()` and a `pagehide` listener. None of these
calls could ever have an effect, but a reader has to understand all of them to
see that.

## Decision
Delete the empty object and every line that only existed to call it. The
"music" tool stays selectable in the UI, exactly as before. When real audio is
built, it gets a plan in docs/plans/ first and is added back in one place.

Same rule as ADR 0005: behaviour and look stay frozen. We checked it by
rendering 9 screens at 1440 and 1000 px (pixel-identical, no console errors)
and by running a focus session with the music tool through start, pause,
resume and finish (same states, no errors, before and after).

## Consequences
- Good: 11 lines less, one idea less to understand in the focus code.
- Sessions saved in a browser may still contain a `soundOff` field. It is
  ignored and harmless.
- Not done on purpose: the migration of old sample titles in the state code
  (it still helps browsers that hold old data; remove it once nobody does) and
  the 19 CSS selectors that appear in two style blocks (they override each
  other partly, so merging them risks changing the look for little gain).
