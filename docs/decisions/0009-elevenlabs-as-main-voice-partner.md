# 0009. ElevenLabs as the main voice and sound partner

Status: Proposed
Date: 2026-10-23
Deciders: Jonas (decided in chat), Jack (to confirm)

## Context
ADR 0004 left open whether Dial or ElevenLabs + Twilio is used. Jonas has an
ElevenLabs Creator plan and wants to use it for as many features as possible.

## Decision
ElevenLabs is the preferred provider for calls, music, sound effects and, later,
speech to text and text to speech (docs/plans/elevenlabs.md). Dial stays
available behind the same `VoiceProvider` interface. This does not supersede
ADR 0004; it only picks the favourite.

## Consequences
- Good: one account and one key for many features.
- Harder: we depend on one vendor; music terms have open points (see plan).
- Every frontend step still needs its own ADR and Jack's OK.
