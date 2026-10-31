# Plan: Calling feature (several daily calls, Claude controls the app by phone)

Status: PROPOSED. Decisions answered by Jonas 2026-10-30 (below). Waiting for his "go" for each build step (AGENTS.md).
Builds on: docs/plans/call-and-chat.md (Phone call page), ADR 0022, 0023. Voice stays on Cartesia (ADR 0023 / 2026-10-28).

## Goal
1. A top-level sidebar entry "Calling feature" where the student sets the phone number and three daily calls
   (Morning, Midday, Night) plus an optional call when a task should start.
2. On the phone, in a call we place AND when the student calls our number, Claude can start the timer and add
   tasks, and the open app does it right away.

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
- Every text block of the page is marked "AI generated" (`.preview-note` plus `AI-GENERATED:` comment, Jonas's rule).
- Fields: phone number (once), consent box (once), three fixed slots Morning, Midday, Night. Each slot: time, on/off.
- Switch "Call me when a task starts": linked to the calendar entries of the task tool (where tasks are added).
- "Call me now" and "Delete my account" stay. Stop/pause stays reachable in the app too.

### 2. Server data and scheduler
- `callTime` becomes `callSlots: [{kind, time, enabled}]` with the three fixed kinds `morning`, `midday`, `night`.
  Old `callTime` is migrated to the `morning` slot, so nobody loses their setting.
- Per slot its own `lastAutoCallDate` (today there is one per student), same 15-minute window as now.
- The kind (`morning`, `midday`, `night`) is sent as a dynamic variable to the Cartesia agent
  (`call_kind`), and picks the opening line. Cost control: the existing daily call counter becomes a hard cap.
- No automatic retry when nobody picks up (plan call-feature.md).

### 2b. Call when a task starts
The app already has calendar entries linked to tasks. It sends upcoming starts (task title, start time, time zone)
to the server next to the task titles (`/api/tasks`). The scheduler places a call at the start time for tasks whose
entry has the call switch on, once per entry, counted in the daily cap.

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

### 3a. Inbound: the student calls our number
- Cartesia: a number is assigned to one agent, an agent can have several numbers; assignment is done in the
  Playground or with `PATCH /agents/phone-numbers/{id}` (docs.cartesia.ai, phone numbers page).
- The inbound agent uses the same tools (`add_task`, `start_timer`, `save_plan`) and the same command queue.
- Who is calling: the student's number must be matched to a registered student. NOT VERIFIED: the Cartesia page does not
  say whether the caller's number reaches the agent (`call_request`, variables). Step 0 of the build checks the
  inbound docs or a test call. If the number does not arrive, the agent asks the student to confirm with the
  recovery code or the last 4 digits spoken. TODO.
- Caller ID can be spoofed, so by phone only low-risk actions are allowed: add task, start timer, stop calls.
  No delete account, no change of phone number, no reading private data aloud beyond task titles.
- Unknown numbers get a short "please sign up in the app" and the call ends.

### 3b. Push instead of polling (later, optional)
Server-Sent Events: one-way server to browser over plain HTTP, automatic reconnect, `Last-Event-ID` lets the server
resend what was missed. Fits "server tells the app" better than WebSockets. Catch: `EventSource` cannot send an
Authorization header, so it needs a short-lived ticket or a fetch-based stream. Start with polling, switch only if
the delay of a few seconds matters.

## Decisions (Jonas, 2026-10-30)
1. Slots: three fixed kinds, Morning, Midday, Night. No free naming, no fourth.
2. "When a task starts" = the calendar entry, linked to the task tool where tasks are added.
3. The Night call may be later than 21:00. ADR 0008's 08:00 to 21:00 window belonged to the Python backend; the
   Node scheduler has no such limit today. It stays that way for the Night slot. Legal check before real users.
4. Inbound is in scope: the student calls our number and can start the timer and add tasks, like in our call.
5. "Calling feature" is a top-level sidebar entry; the page is built and marked "AI generated".

## Risks
- Several calls a day multiply cost; keep the per-student daily cap and show call history to the student.
- Consent: one box today. FCC rules on revoking consent: callers must honor a stop request within a reasonable time,
  at most 10 business days; stop words and other reasonable ways count. Keep "say stop on the call" and add the
  in-app switch. Not legal advice, get it checked before real users (see call-feature.md).
- A command that never reaches an open app: expiry plus honest wording on the phone.
- Phone numbers stay out of logs (AGENTS.md); tests use +15555550100 style numbers.

## Steps (after the go)
0. Check how the caller's number reaches a Cartesia inbound agent (docs or one test call).
1. ADR "Calling feature" (supersedes ADR 0022 point 2: Phone call page moves).
2. Server: slots + migration + per-slot scheduler, tests (server/test).
3. Server: `commands` queue + the two webhook tools + tests (secret, expiry, wrong user).
4. Frontend: sidebar entry, page, command polling; docs/architecture.md updated in the same PR.
5. Cartesia: add the two tools and `call_kind` to the outbound agent; create the inbound agent and assign a number
   (dashboard, steps documented).
6. Test call per kind on a real phone, then "start the timer" in an outbound and an inbound call with the app open.
Each step is its own pull request.

## Done when
Morning, Midday and Night call at their local times, the call names Concentr8 and says it is an AI, "add a task" and
"start the timer" said on the phone (outbound or inbound) show up in the open app within seconds, and tests cover migration, expiry,
secret check and stop.

## Sources (read 2026-10-30)
- Cartesia phone numbers: https://docs.cartesia.ai/line/integrations/telephony/phone-numbers.md
- Cartesia Line SDK: https://docs.cartesia.ai/line/sdk/overview.md (loopback tools, Claude usable through LiteLLM)
- Claude tool definitions: https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- Server-Sent Events: https://web.dev/articles/eventsource-basics
- FCC consent revocation summary: https://www.privacyworld.blog/2024/02/fcc-clarifies-and-codifies-tcpa-consent-revocation-rules/
