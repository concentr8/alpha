# Architecture

Status: skeleton with placeholders. Update this file in every pull request that
adds, moves or removes a file.

## Big picture
    Browser (frontend/index.html)  ->  Backend API (backend/src)  ->  Provider (Dial or ElevenLabs+Twilio)
                                              |                          Claude API (writes the call script)
                                              +-> Scheduler (runs jobs at each user's local time)

The frontend is frozen (ADR 0001). Only the backend changes for now.

## File map
| File | Purpose | Status |
|---|---|---|
| frontend/index.html | Whole UI in one file. Stores data in the browser (localStorage). | Small edits only (ADR 0022). Jack's 2026-10-21 version plus the ElevenLabs block (ADR 0010, 0013) and a phone layout block (ADR 0014) |
| docs/evidence/mobile-layout/ | Before/after screenshots at phone width (proof for ADR 0014) | New |
| frontend/music/ | Four music loops for the Music page (ADR 0015) | New |
| docs/music-credits.md | Source and terms of every audio file | New |
| docs/design.md | Look of the frontend: tokens and components to reuse | Updated for the 2026-10-21 version |
| backend/src/main.py | Creates the app, CORS, plugs in routers, /health | Works |
| backend/src/config.py | Reads all settings and secrets from the environment | Works |
| backend/src/calls/schemas.py | Data shapes: schedule input, stored schedule, call log entry | Works |
| backend/src/calls/router.py | Web addresses under /calls, thin; turns errors into HTTP statuses | Works |
| backend/src/calls/service.py | Business rules: consent, time zone, stop, calling hours, placing a call | Works (fake provider) |
| backend/src/calls/store.py | Remembers schedules and call status, in memory (ADR 0008) | Works, data lost on restart |
| backend/src/calls/phone.py | Hides phone numbers for logs | Works |
| backend/src/calls/scheduler.py | Runs the call jobs at the planned times | Not built |
| backend/Procfile | Start command for Heroku (see docs/deploy-heroku.md) | New |
| backend/src/voice/service.py | Speaks text and transcribes recordings with ElevenLabs, size limits, audio cache | New |
| backend/src/voice/limits.py | Spending limits: per visitor per hour, daily budget for the app | New |
| backend/src/voice/router.py | `/voice/speak` and `/voice/transcribe`, thin | New |
| backend/src/providers/base.py | Interface all voice providers follow, plus a fake one | Works |
| backend/src/providers/registry.py | Picks the provider named in VOICE_PROVIDER | Works |
| backend/src/providers/dial_provider.py | Dial adapter | Placeholder |
| backend/src/providers/elevenlabs_provider.py | ElevenLabs + Twilio adapter (API notes inside) | Placeholder |
| backend/src/providers/llm_claude.py | Claude writes the call script | Placeholder (fixed text) |
| backend/tests/test_voice_*.py | Tests for the voice rules, limits and addresses | New |
| backend/tests/ | Tests, mirror src/ | 3 files |
| docs/backend-overview.md | The backend on one page, for non-programmers | New |
| .github/workflows/ci.yml | Runs pytest on every pull request | New, untested on GitHub yet |
| .github/workflows/pages.yml | Publishes frontend/ as a website (GitHub Pages) | New |
| server/ | Concentr8 call server (Node, no dependencies), imported unchanged from intentguard-v2 | New, tests run in CI |
| .github/workflows/deploy-server.yml | Tests server/, deploys it to the Azure web app `concentr8-api`, then checks `/api/health` | New |
| docs/plans/download-site.md | Plan: download site, app builds, stable releases | New |
| docs/decisions/0021-app-in-alpha-downloads-on-site-repo.md | ADR: builds in alpha, stable downloads on the site repo | New |
| app/main.js | Desktop app: opens `frontend/index.html` in a window | New |
| app/preload.js | The one door from the page to the desktop part: `window.concentr8Desktop` (ADR 0024) | New |
| app/desktop/rules.js | Decides work, neutral or distraction for the program or page on screen | New (ported from the Cal Hacks app) |
| app/desktop/apps.js | Turns names in the block list ("YouTube") into app and website rules | New |
| app/desktop/platform.js | Reads the front program and browser tab, closes tabs, hides apps (AppleScript, Mac only) | New (ported) |
| app/desktop/platform-other.js | Same as platform.js for Windows (PowerShell) and Linux (xdotool, X11): program and window title, Ctrl+W, minimize | New |
| app/desktop/relevance.js | Plain rules first, then the AI check through the server (`/api/relevance`) | New (ported) |
| app/desktop/blocker.js | The focus loop: warn, wait 15 seconds, close, go back to the last work page | New (ported) |
| app/desktop/bridge.js | Electron side of the door: starts and stops the blocker, shows notifications | New |
| app/test/desktop.test.js | Tests for the blocker with a fake screen and clock (`npm test` in app/) | New |
| frontend/concentr8-blocker.js | Hints and AI switch on the Block App page; starts the blocker during a session (AI generated) | New |
| app/package.json | App name, version, build settings (electron-builder) | New |
| app/build/icon.png | App icon | New (from the Cal Hacks app) |
| .github/workflows/app-beta.yml | Builds Mac, Windows, Linux apps on every merge and publishes a beta (Pre-release) | New |
| .github/workflows/promote-stable.yml | Copies a tested beta into a stable release on the website repo | New |
| scripts/count-strings.js | Counts the English texts in the app (step 0 of docs/plans/languages.md); reads only, changes nothing | New |
| frontend/concentr8-server.js | Connects the web app to the server: AI chat and phone call setup (ADR 0022) | New |
| docs/plans/call-and-chat.md | Plan: phone call setup and AI chat in the app | New |
| docs/decisions/0027-chat-actions-and-tools-in-chat.md | ADR: chat actions from the model, tools inside the chat, no stored chat | New |
| docs/decisions/0022-frontend-talks-to-the-concentr8-server.md | ADR: what changed in the frozen frontend and why | New |
| server/voice.js | ElevenLabs speech for the app: read aloud and voice input, limits and audio cache (ADR 0023) | New |
| server/test/voice.test.js | Tests for the voice routes | New |
| server/test/chat-actions.test.js | Tests for the chat `actions` (tool use): only valid actions get through, at most 2, bad times and unknown tools are dropped | New |
| server/test/guest-chat.test.js | Tests for the AI chat without login (`POST /api/chat/guest`): limits per guest, per address and overall | New |
| docs/plans/voice-on-azure.md | Plan: voice on the Azure server | New |
| docs/plans/chat-followups.md | Plan: follow-ups of the chat actions (due date, Back from chat cards, French "tu", translations) | New, waiting for a human go |
| docs/decisions/0023-voice-on-the-node-server.md | ADR: voice moves from Heroku to the Node server | New |
| .env.example | Names of required secrets | Works |

## How a call happens (target flow)
1. User agrees to calls and picks days and a time. The API stores the schedule
   with the time of consent (works today, in memory).
2. The scheduler fires at that local time.
3. service.py checks the rules, asks Claude for a short script, asks the
   provider to place the call, stores only the status.

## Where to read next
- Why things are built this way: docs/decisions/
- The backend on one page: docs/backend-overview.md
- What we are building now: docs/plans/call-feature.md
- Mac app with app blocking (draft): docs/plans/mac-app.md
- ElevenLabs across the app (draft): docs/plans/elevenlabs.md
- Spoken meditation and voice input (built): docs/plans/voice-and-sound.md
- AI assistant connected to an LLM (draft): docs/plans/ai-assistant.md
- Put the backend online: docs/deploy-heroku.md
- Phone layout (built): docs/plans/mobile-layout.md

## Rules GitHub should enforce (repo owner sets them once)
Settings > Branches > rule for `main`: require a pull request with 1 approval,
require the `tests` check to pass, block force pushes. Branch protection may
not be available for private repos on a free plan.
