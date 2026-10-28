# Plan: Spoken meditation and voice input with ElevenLabs

Status: BUILT (first version), go from Jonas on 2026-10-23. Part of
docs/plans/elevenlabs.md. Phone calls are NOT part of this plan.

## Goal
1. The daily meditation is read aloud at its cue times.
2. The voice input of the AI agent works in every browser with a microphone,
   not only in browsers that have their own speech recognition.
3. Music files get real addresses (waits for the files, see music.md).

## How it works
- Backend (backend/src/voice/): `POST /voice/speak` (text in, MP3 out) and
  `POST /voice/transcribe` (recording in, text out). Only the backend knows the
  ElevenLabs key. Spoken meditation audio is saved on disk, so each text is
  paid for once, not once per listener.
- Frontend (one new block `elevenlabs.js` in frontend/index.html): OFF unless the
  page is opened with `?api=<backend address>` (remembered; `?api=off` clears).
  Off means the page behaves exactly as before. Three tiny hooks exist:
  the meditation `paint()` calls `MeditationVoice.sync(...)`, and voice.js
  prefers `Articul8SpeechEngine` when it exists.

## Verified (ElevenLabs docs, read 2026-10-23)
- Text to speech: `POST /v1/text-to-speech/:voice_id`, header `xi-api-key`,
  body `text` (required) and `model_id`, answer is audio (default MP3).
- Speech to text: `POST /v1/speech-to-text`, multipart with `model_id`
  (e.g. `scribe_v2`) and `file`, answer has a top-level `text`.
- Not verified: price per character, Creator plan character limit, which voice
  ids are available on the plan.

## Setup (Jonas)
`ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` in backend/.env. Open the page
with `?api=http://localhost:8000` while the backend runs locally.

## Checks done
- 7 new backend tests with a fake ElevenLabs (rules, exact requests, cache) pass.
  3 more tests of the web addresses wait for CI (fastapi cannot be installed here).
- Browser test with a fake backend: off by default; speaks at start, pauses,
  speaks the right cue after a seek; microphone recording is transcribed.
- Existing browser test (31 checks) still passes.
- NOT done: a real ElevenLabs call and a real browser microphone.

## Open points
- Spending limits are built (src/voice/limits.py, ADR 0011). The default numbers
  are guesses: we have not checked the ElevenLabs plan's included characters.
- Hosting: Heroku, see docs/deploy-heroku.md and ADR 0012 (not yet tried).
- TODO: the daily cache lives on local disk; use durable storage when deployed.
- The user's voice recording goes to ElevenLabs. Before real users: tell them
  and ask for consent (privacy text, own decision).
- The voice input's in-page error texts still say "browser" in places (frozen UI).
