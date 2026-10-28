# 0004. Voice providers behind one interface

Status: Proposed
Date: 2026-10-20
Deciders: Jonas (to confirm), team

## Context
We have not decided between Dial and ElevenLabs + Twilio, and Claude (the
language model) is a separate choice from the phone provider.

## Decision
All providers implement `VoiceProvider` (src/providers/base.py). A setting
VOICE_PROVIDER picks one: dial, elevenlabs or mock. The default is mock so no
real call happens by accident. Claude is called from llm_claude.py, not from
the providers.

## Consequences
- Good: we can try both providers and switch without touching the rules in
  service.py; tests run with the fake provider.
- Harder: a small extra layer to maintain.
