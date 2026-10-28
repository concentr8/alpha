# 0011. Voice spending limits kept in memory

Status: Proposed
Date: 2026-10-23
Deciders: Jonas (asked for a limit before going public), Jack (to review)

## Context
The voice endpoints cost ElevenLabs credits per call and will be public once
the backend is online. There are no user accounts yet.

## Decision
Two limits in src/voice/limits.py, counted in memory: requests per visitor per
hour (visitor = address from X-Forwarded-For, else the connection), and a
daily budget for the whole app (characters read aloud, recordings
transcribed). Cached audio is free. Answer 429 when a limit is used up.

## Consequences
- Good: simple, no new dependency, the daily budget caps the worst case even
  if a caller fakes the visitor address.
- Harder: counters reset on a server restart and are not shared between
  servers; the default numbers are guesses (plan size not checked).
