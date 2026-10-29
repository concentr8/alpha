# Plan: Voice (speak and listen) on the Azure server

Status: Approved by Jonas on 2026-10-28 ("ich würde gerne alles auf azure umziehen"). Built the same day.
Goal: one server for everything. Spoken meditation cues and voice input no longer use the old Heroku backend.

## What changes
- `server/voice.js` (new): the two ElevenLabs requests, ported from `backend/src/voice/` (Python): text to speech and
  speech to text, same size limits (2000 characters, 10 MB), same spending limits, audio cache.
- Routes `POST /api/voice/speak` and `POST /api/voice/transcribe` in `server/index.js`. Unlike the old Heroku routes
  they need a signed-in student (token), so strangers cannot spend ElevenLabs credits when the server is closed.
- `frontend/index.html` (elevenlabs.js block): address now comes from `concentr8-server.js`, paths start with
  `/api/voice/`, the token is sent. Nothing else in the voice code changes.
- Limits: 60 requests per student per hour, 20,000 spoken characters and 200 recordings per day for the whole app
  (settings `VOICE_REQUESTS_PER_USER_PER_HOUR`, `VOICE_DAILY_SPEECH_CHARACTERS`, `VOICE_DAILY_TRANSCRIPTIONS`).
  Counters are in memory and reset on a restart. TODO: keep them in the data file.
- Audio cache: `voice-cache/` next to the data file, so it survives restarts on Azure (`/home/data`).

## Jonas does (one time, secrets stay out of chat)
Copy the ElevenLabs values from Heroku (app `articul8-api`, Settings, Config Vars) to Azure (Environment variables):
`ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. Optional: `ELEVENLABS_TTS_MODEL`, `ELEVENLABS_STT_MODEL`.
After a test, the Heroku app can be stopped; the Python `backend/` is then no longer used (to be removed in its own pull request, after Jonas agrees).

## Not in this step
Screen sharing in the desktop app, the ElevenLabs phone agent (calls stay on Cartesia), removing `backend/`.
