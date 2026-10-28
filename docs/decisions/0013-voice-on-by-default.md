# 0013. Voice is on by default in the frontend

Status: Proposed
Date: 2026-10-23
Deciders: Jonas (asked for it in chat), Jack (to review)
Supersedes: the "opt-in" part of ADR 0010

## Context
ADR 0010 made the ElevenLabs voice opt-in: it only worked when the page was
opened once with `?api=<address>`. For the customer interviews the short link
must work on its own, on any device, without that extra step.

## Decision
The frontend uses our online backend (ADR 0012) by default. `?api=<address>`
still switches to another address (remembered). `?api=off` turns the voice off
and the browser remembers that. If the backend is unreachable the page keeps
working without voice, as before.

## Consequences
- Good: the short link has the voice; nothing to explain to testers.
- Harder: every visitor's meditation text (and microphone audio, if used) now
  goes to ElevenLabs through our backend. A consent notice is needed before
  real users (TODO, see docs/plans/elevenlabs.md).
- The backend address is written into the page; if the Heroku app is renamed,
  the constant `DEFAULT_API` must change.
- Costs: every visitor can use our ElevenLabs quota; the limits of ADR 0011
  are the only protection.
