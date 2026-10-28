# Plan: ElevenLabs as the main voice and sound partner

Status: DRAFT. Jonas wants ElevenLabs used as much as possible (2026-10-23,
plan: Creator). No code yet. Each frontend step still needs Jack's OK and an ADR
(frontend is frozen, ADR 0001). Facts below were read in the ElevenLabs docs on
2026-10-23; "not checked" means we did not verify it.

## What ElevenLabs offers (docs overview)
Text to Speech, Speech to Text, Music, Sound effects, ElevenAgents (voice
agents), Voice changer, Dubbing and more. We only plan the first five.

## Where it fits in Articul8
| Articul8 part | Today (read from frontend/index.html) | With ElevenLabs | Size of change | Status |
|---|---|---|---|---|
| Reminder calls | Not in the frontend at all | ElevenAgents + Twilio number, backend only | Backend (Phase 2 to 3 of call-feature.md) | Endpoint and fields verified |
| Music page | Four mixes, `url: null`, nothing plays | Loops made once with Eleven Music, files put into the track lists | Smallest: data only | See music.md |
| Voice input to the AI agent | Browser `SpeechRecognition` (works only in some browsers) | Speech to Text through the backend | Medium: needs backend and a key-safe route | API not checked |
| Spoken guidance (e.g. wellness, body rooms) | No spoken voice today | Text to Speech through the backend | New feature, medium | API not checked |
| Nature sounds | None | Sound effects, generated once like the music | Small, same way as music | API not checked |
| AI chat answers | Not connected to any model | Claude writes the text (llm_claude.py); ElevenLabs only speaks | Backend, separate plan | Not planned here |

Dial stays as the second provider behind `VoiceProvider` (ADR 0004). What we
need it for is not decided.

## Order (smallest first)
1. Music loops (no code, Jonas generates, Jack agrees to the `url` edits).
2. Test call to Jonas's own number (call-feature.md Phase 2).
3. Scheduler for real calls (Phase 3).
4. Speech to Text and Text to Speech, only after a separate small plan each,
   because they send user voice or text to ElevenLabs (privacy and consent).

## Rules that stay
- Keys only in backend/.env, never in the frontend. The browser talks to our
  backend, never to ElevenLabs directly.
- Phone numbers masked in logs, fake numbers in tests.
- No user audio or text is sent to ElevenLabs before the user is told and agrees.

## Open points
- Creator is "For Individual Use Only" in the music terms. Does a team startup
  count? Ask ElevenLabs support.
- May app users download the music files (Music Library rule 4.2)? Ask support.
- Prices and usage limits per feature: not checked.
- Where the Twilio `agent_phone_number_id` comes from: not found in the docs.
