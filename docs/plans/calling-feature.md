# Plan: Calling feature (several daily calls, Claude controls the app by phone)

Status: PROPOSED. Written 2026-10-30, waiting for Jonas's "go" (AGENTS.md: plan first, no code yet).
Builds on: docs/plans/call-and-chat.md (Phone call page), ADR 0022, 0023. Voice stays on Cartesia (ADR 0023 / 2026-10-28).

## Goal
1. A sidebar entry "Calling feature" where the student sets the phone number and up to 3 calls per day
   (for example Morning, Midday, Evening, Good night) plus an optional call when a task should start.
2. On the phone, Claude can start the timer and add tasks, and the open app does it right away.

## What exists today (read from the code, 2026-10-30)
- One call time per student (`callTime`), one scheduler tick every 30 s (`schedulerTick`, server/index.js).
- Calls run as a Cartesia agent. The agent saves things through a webhook tool
  `/cartesia/save-plan` (Bearer `CARTESIA_WEBHOOK_SECRET`), the app reads the result by polling `/api/today`.
- The app already exposes `window.FocusUI.start({taskId, minutes, mode, ...})` and `Articul8.addTask(text)`
  (window.Articul8 is the state object), so the app side needs no new hooks in index.html.
- The Phone call page lives under Profile (`Concentr8.callPage`).

## Design
### 1. Sidebar and page (frontend)
- New sidebar button "Calling feature" (`data-page`), the existing Phone call page moves there. The Profile entry
  is removed, not duplicated. Built from existing classes, marked AI generated for Jack (AGENTS.md).
- Fields: phone number (once), consent box (once), up to 3 call slots. Each slot: name/kind, time, on/off.
- Switch "Call me when a task should start" (see open question 2).
- "Call me now" and "Delete my account" stay. Stop/pause stays reachable in the app too.

### 2. Server data and scheduler
- `callTime` becomes `callSlots: [{id, kind, time, enabled}]`, maximum 3. Old `callTime` is migrated to one
  `morning` slot, so nobody loses their setting.
- Per slot its own `lastAutoCallDate` (today there is one per student), same 15-minute window as now.
- The kind (`morning`, `midday`, `evening`, `goodnight`) is sent as a dynamic variable to the Cartesia agent
  (`call_kind`), and picks the opening line. Cost control: the existing daily call counter becomes a hard cap.
- No automatic retry when nobody picks up (plan call-feature.md).

### 3. Claude controls the app by phone
Flow: student says "start the timer" -> Claude (the agent's LLM) calls a webhook tool -> server stores a command
-> the open app picks it up and runs it.
- Two new webhook tools next to `save_plan`, same Bearer secret:
  `add_task {user_id, title}` and `start_timer {user_id, task?, minutes?}`.
- Server keeps a small per-student queue `commands` (id, type, payload, createdAt), expires after 10 minutes,
  maximum 20 entries. `GET /api/commands?after=<id>` returns new ones (student token).
- App: while open, asks every few seconds (same style as `/api/today`) and runs the command through
  `FocusUI.start` / `addTask`. Text on the tool result tells Claude honestly whether the app took it
  ("queued, starts as soon as the app is open") so it does not claim a timer is running when it is not.
- The timer lives in the browser's state, so the app must be open (web or desktop). This is a limit of today's
  design, not of the phone side. Say it on the page.
- Tool definitions follow Anthropic's advice: long descriptions (what, when, when not, each parameter), typed
  `input_schema`, a small number of tools.

### 3b. Push instead of polling (later, optional)
Server-Sent Events: one-way server to browser over plain HTTP, automatic reconnect, `Last-Event-ID` lets the server
resend what was missed. Fits "server tells the app" better than WebSockets. Catch: `EventSource` cannot send an
Authorization header, so it needs a short-lived ticket or a fetch-based stream. Start with polling, switch only if
the delay of a few seconds matters.

## Decisions needed from Jonas
1. "Up to 3 daily calls" but 4 examples (morning, midday, evening, good night): max 3 slots with free choice of
   kind, or 4 fixed kinds? Recommended: 3 slots, kind is a label the student picks.
2. "When a task should start": which start time? Tasks in the app have titles but no start time. Options:
   calendar entries (focus entries) or a start time field on tasks. Recommended: calendar entries, the app sends
   upcoming starts to the server next to the task titles.
3. Good night calls: ADR 0008 allows calls only 08:00 to 21:00 local (Python backend, a careful default, not legal
   advice). Keep that window for all slots, or allow later for good night?
4. "On the phone" = during a call we place (this plan), or also calling our number to give commands (inbound)?
   Inbound needs another Cartesia agent and number setup.
5. Where does the "Calling feature" button sit: top level in the sidebar, or as a child under an existing entry
   (like Workflow under Toolbox)? Needs Jack's OK.

## Risks
- Several calls a day multiply cost; keep the per-student daily cap and show call history to the student.
- Consent: one box today. FCC rules on revoking consent: callers must honor a stop request within a reasonable time,
  at most 10 business days; stop words and other reasonable ways count. Keep "say stop on the call" and add the
  in-app switch. Not legal advice, get it checked before real users (see call-feature.md).
- A command that never reaches an open app: expiry plus honest wording on the phone.
- Phone numbers stay out of logs (AGENTS.md); tests use +15555550100 style numbers.

## Steps (after the go)
1. ADR "Calling feature" (supersedes ADR 0022 point 2: Phone call page moves).
2. Server: slots + migration + per-slot scheduler, tests (server/test).
3. Server: `commands` queue + the two webhook tools + tests (secret, expiry, wrong user).
4. Frontend: sidebar entry, page, command polling; docs/architecture.md updated in the same PR.
5. Cartesia agent: add the two tools and the `call_kind` variable (done in the Cartesia dashboard, steps documented).
6. Test call per kind on a real phone, then one "start the timer" call with the app open.
Each step is its own pull request.

## Done when
Three slots call at their local times, the call names Concentr8 and says it is an AI, "add a task" and
"start the timer" said on the phone show up in the open app within seconds, and tests cover migration, expiry,
secret check and stop.

## Sources (read 2026-10-30)
- Cartesia Line SDK: https://docs.cartesia.ai/line/sdk/overview.md (loopback tools, Claude usable through LiteLLM)
- Claude tool definitions: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- Server-Sent Events: https://web.dev/articles/eventsource-basics
- FCC consent revocation summary: https://www.privacyworld.blog/2024/02/fcc-clarifies-and-codifies-tcpa-consent-revocation-rules/
