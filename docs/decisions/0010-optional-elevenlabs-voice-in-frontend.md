# 0010. Optional ElevenLabs voice in the frontend

Status: Proposed
Date: 2026-10-23
Deciders: Jonas (go given in chat), Jack (to review)

## Context
ADR 0001 froze the frontend. Jonas wants the meditation read aloud and voice
input that works everywhere, using ElevenLabs (ADR 0009). The page has no
connection to the backend today.

## Decision
Add one self-contained block (`elevenlabs.js`) and three one-line hooks. The
feature is opt-in: without `?api=<address>` nothing changes. The browser calls
our backend only; the key stays in backend/.env. No new buttons, colors or
layouts.

## Consequences
- Good: smallest possible change to Jack's design; easy to remove.
- Harder: the frontend now has a second code path to keep working; the
  production switch (a fixed backend address) is a later decision.
- User voice and text go to ElevenLabs when the feature is on (consent needed).
