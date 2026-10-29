# 0023. Voice runs on the Concentr8 Node server (supersedes ADR 0002, 0004, 0009, 0012 for voice)

Status: Accepted (Jonas, 2026-10-28)
Date: 2026-10-28
Deciders: Jonas

## Context
Voice input and spoken cues used the Python backend on Heroku. Calls, chat and accounts are on the Node server on
Azure (ADR 0021, 0022). Two servers mean two sets of secrets, two deploys and a second place to watch.

## Decision
The two voice endpoints move to the Node server (`server/voice.js`), behind the student token. The Python backend
stays in the repo until Jonas agrees to remove it.

## Consequences
- Good: one address, one deploy, one place for secrets; strangers cannot spend ElevenLabs credits on a closed server.
- Harder: voice now needs a signed-in student; counters reset on restart.
- Voice works only with `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` set in Azure.
