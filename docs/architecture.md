# Architecture

Status: skeleton with placeholders. Update this file in every pull request that
adds, moves or removes a file.

## Big picture
    Browser (frontend/index.html)  ->  Backend API (backend/src)  ->  Provider (Dial or ElevenLabs+Twilio)
                                              |                          Claude API (writes the call script)
                                              +-> Scheduler (runs jobs at each user's local time)

The frontend is mostly frozen (ADR 0001); approved page-specific changes are
listed in their plan and decision record. Calendar redesign is scoped to its
existing inline blocks plus the pure helper documented in ADR 0028.

## File map
| File | Purpose | Status |
|---|---|---|
| frontend/index.html | Whole UI in one file: Jack's redesign of 2026-11-03 (ADR 0036). Stores local data, chats included, in the browser (localStorage); Calendar exposes a separate in-memory read-only extension point. | Replaced by Jack's version |
| docs/evidence/mobile-layout/ | Before/after screenshots at phone width (proof for ADR 0014) | New |
| docs/evidence/calendar/ | 1440/390 before/after screenshots; README explains synthetic fixtures, per-PR images and browser checks | New |
| frontend/music/ | Four music loops for the Music page (ADR 0015) | New |
| docs/music-credits.md | Source and terms of every audio file | New |
| docs/design.md | Look of the frontend: tokens and components to reuse | Updated for 2026-10-31 Calendar redesign (ADR 0028) |
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
| docs/plans/ios-app.md | Plan: Concentr8 iPhone app with app blocking, focus check, tasks and chat | New, go given |
| docs/plans/ios-app-phase-1.md | Spec for the first unattended run of the iPhone app: layout, done-when, rules | New |
| docs/decisions/0043-ios-app-swiftui-and-xcodegen.md | ADR: iPhone app is native SwiftUI, project generated with XcodeGen | New, proposed |
| docs/decisions/0044-shield-screen-without-visible-ai-marker.md | ADR: the shield screen shows no "AI generated" text; the marker stays in the code and the pull request | New, proposed |
| ios/project.yml | XcodeGen definition of the iPhone app and its three Screen Time extensions; `xcodegen generate` writes the Xcode project (not committed) | New |
| ios/Shared/DesignTokens.swift | Colours and corner sizes from docs/design.md as Swift constants | New |
| ios/Shared/AppGroup.swift | App Group name and storage keys shared by the app and the extensions | New |
| ios/Shared/FocusSessionClock.swift | Plain focus session logic: start, stop, remaining time (no UI) | New |
| ios/Shared/AnswerStore.swift | The three "Are you focused?" answers and their storage with a time in the App Group | New |
| ios/Shared/SelectionStore.swift | Remembers the apps the student chose to block, for the Monitor extension | New |
| ios/Concentr8Tests/FocusSessionClockTests.swift | Tests for session timing with fixed dates | New, not run yet (no Xcode on the run machine) |
| ios/Concentr8Tests/AnswerStoreTests.swift | Tests for storing answers in a throw-away storage | New, not run yet (no Xcode on the run machine) |
| ios/Concentr8/Concentr8App.swift | Entry point of the iPhone app | New |
| ios/Concentr8/HomeView.swift | Home screen: choose apps to block, start and stop a focus session, next tasks (AI generated) | New |
| ios/Concentr8/SessionController.swift | Screen Time permission, chosen apps, starts and stops the DeviceActivity schedule | New, needs a real iPhone to try |
| ios/Concentr8/SampleTasks.swift | Sample data for the next-tasks list until the server contract is known | New |
| ios/Concentr8/Info.plist | App settings (name, version, launch screen) | New |
| ios/Concentr8/Concentr8.entitlements | Family Controls and App Group for the app | New, signing by a human |
| ios/Concentr8/Assets.xcassets/ | Images of the app: `AppIcon`, the desktop icon (`app/build/icon.png`) redrawn edge to edge, because iOS cuts the corners itself | New |
| ios/Concentr8Monitor/DeviceActivityMonitorExtension.swift | Monitor extension: shields the chosen apps while a session runs, lifts the shield at the end | New, needs a real iPhone to try |
| ios/Concentr8Monitor/Info.plist | Settings of the Monitor extension | New |
| ios/Concentr8Monitor/Concentr8Monitor.entitlements | Family Controls and App Group for the Monitor extension | New, signing by a human |
| ios/Concentr8ShieldConfig/ShieldConfigurationExtension.swift | Shield screen "Are you focused?" (AI generated, marker only in the code, ADR 0044); only two buttons fit | Tried on an iPhone 12 Pro; readable colours and icon added |
| ios/Concentr8ShieldConfig/Assets.xcassets/ | Images of the ShieldConfig extension: `ShieldIcon` (the round bear from the desktop icon) shown on the shield screen | New |
| ios/Concentr8ShieldConfig/Info.plist | Settings of the ShieldConfig extension | New |
| ios/Concentr8ShieldConfig/Concentr8ShieldConfig.entitlements | Family Controls and App Group for the ShieldConfig extension | New, signing by a human |
| ios/Concentr8ShieldAction/ShieldActionExtension.swift | Stores the shield answer with a time in the App Group | New, needs a real iPhone to try |
| ios/Concentr8ShieldAction/Info.plist | Settings of the ShieldAction extension | New |
| ios/Concentr8ShieldAction/Concentr8ShieldAction.entitlements | Family Controls and App Group for the ShieldAction extension | New, signing by a human |
| docs/decisions/0021-app-in-alpha-downloads-on-site-repo.md | ADR: builds in alpha, stable downloads on the site repo | New |
| app/main.js | Desktop app: opens `frontend/index.html` in a window; web links (and the Google sign-in) go to the default browser | New |
| app/desktop/links.js | Decides which addresses may go to the default browser: only http and https (ADR 0035) | New |
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
| frontend/concentr8-server.js | Connects the web app to the server: AI chat (one answer per chat, Quick Start planning), Google sign-in and phone call setup (ADR 0022, 0032, 0036) | New |
| frontend/chat-history.js | Jack's chat history: stored chats, a new chat reuses an empty one, short chat titles. Pure, no network or storage (ADR 0036) | New |
| frontend/chat-scroll.js | Jack's chat scrolling: a conversation follows new messages only while the student is at the bottom (ADR 0037) | New |
| docs/plans/call-and-chat.md | Plan: phone call setup and AI chat in the app | New |
| docs/decisions/0027-chat-actions-and-tools-in-chat.md | ADR: chat actions from the model, tools inside the chat, no stored chat | New |
| docs/decisions/0022-frontend-talks-to-the-concentr8-server.md | ADR: what changed in the frozen frontend and why | New |
| server/voice.js | ElevenLabs speech for the app: read aloud and voice input, limits and audio cache (ADR 0023) | New |
| server/test/voice.test.js | Tests for the voice routes | New |
| server/test/chat-actions.test.js | Tests for the chat `actions` (tool use): only valid actions get through, at most 2, bad times and unknown tools are dropped | New |
| server/test/guest-chat.test.js | Tests for the AI chat without login (`POST /api/chat/guest`): limits per guest, per address and overall | New |
| docs/plans/voice-on-azure.md | Plan: voice on the Azure server | New |
| docs/plans/chat-followups.md | Plan: follow-ups of the chat actions (due date, Back from chat cards, French "tu", translations) | New, waiting for a human go |
| docs/plans/chat-interview-and-google-login.md | Plan: chat asks first, time estimates, Google sign-in (CON-53 backend items) | New, waiting for a human go |
| docs/plans/simplicity-redesign.md | Plan: redesign of first start and Home for simplicity (flows, tokens, components, pull requests with acceptance criteria) | New, waiting for a human go |
| docs/decisions/0045-simplicity-redesign-decisions.md | ADR: five decisions for the redesign (warm colours, optional calendar step, rows instead of swipe cards, no visible AI note, Playwright) | New |
| docs/design/baseline.md | Steps, clicks, screens, words and time of the five core tasks on main at 158af01; the yardstick for the redesign | New |
| docs/design/audit.md | Heuristic evaluation and three persona walkthroughs of first start and Home, with severity | New |
| docs/design/research.md | Sourced research (ADHD, onboarding, motion, WCAG 2.2 AA) and teardown of five reference apps | New |
| docs/design/mockups/ | Static before/after mockups (`index.html`), proposed tokens (`tokens.css`), screenshots of main (`before/`) | New |
| docs/plans/sign-in-on-first-open.md | Plan: the Google sign-in page opens when a signed-out student starts the app | New |
| docs/plans/todos-on-calendar.md | Plan: new to-dos are placed on the calendar by themselves, with or without Google Calendar | New |
| docs/decisions/0041-todos-placed-on-the-calendar.md | ADR: new to-dos get a block by themselves, and the rules that protect the week | New |
| docs/plans/demo-without-google.md | Plan: a `?demo` link opens the app without a Google account | New, waiting for a human go |
| docs/decisions/0042-demo-link-without-google.md | ADR: the one exception to the Google sign-in, for demos | New, proposed |
| frontend/concentr8-demo.js | Demo mode: `?demo` skips Google sign-in; fixed chat answer with three to-dos and their steps (ADR 0042). AI generated | New |
| frontend/test/demo.test.js | Tests for demo mode: switch on/off, the fixed answer, due dates | New |
| frontend/task-placement.js | Gives a new to-do a block in the first free slot, with or without Google Calendar (ADR 0041) | New |
| frontend/test/task-placement.test.js | Tests for placing to-dos: slots, deadlines, waiting for Google, deleted and finished blocks | New |
| docs/decisions/0038-sign-in-required-on-start.md | ADR: students sign in with Google before the app opens; no guest mode | New |
| docs/decisions/0040-google-first-on-start.md | ADR: a signed-out student goes straight to Google; the Concentr8 page is only the fallback | New |
| docs/decisions/0039-calendar-optional-in-settings.md | ADR: the calendar is optional and connected in Settings, so sign-in is Google's standard page | New |
| frontend/test/signin.test.js | Tests for the sign-in page on start: opens signed out, cannot be closed, stays away when signed in | New |
| docs/decisions/0023-voice-on-the-node-server.md | ADR: voice moves from Heroku to the Node server | New |
| .env.example | Names of required secrets | Works |
| docs/plans/calendar-redesign.md | Approved calendar-only redesign plan | New |
| docs/plans/calendar-wireframes.md | Text wireframes for Jack before implementation | New |
| docs/plans/calendar-find-time.md | Approved calendar-only availability plan | New |
| docs/plans/google-calendar.md | Approved read-only OAuth, frontend contract and future ICS fallback | New |
| docs/plans/google-signin.md | Plan: sign in with Google only, calendar required | New, waiting for a human go |
| docs/plans/estimate-time-first.md | Plan: chat to-dos keep their confirmed time estimate and show it in the to-do list and calendar (CON-35) | New |
| docs/plans/brain-dump-and-profile-picture.md | Plan: Home brain dump, due dates from the chat, profile picture (CON-32, 33, 34, 36) | New |
| docs/plans/start-focus-minimal.md | Plan: Start focus dialog with one field, everything else under Advanced | New |
| docs/plans/quickstart-button.md | Plan: Quick start button on Home, one click into a 10 minute focus session (CON-38) | New |
| server/google-calendar.js | Per-student read-only OAuth, encrypted refresh credentials, calendar selection and event pagination | New |
| server/test/google-calendar.test.js | Mocked OAuth, cookie/state/PKCE, isolation, selection, range, timezone and disconnect tests | New |
| frontend/concentr8-google-calendar.js | Runtime Settings dialog and in-memory read-only calendar adapter; calls the same Concentr8 server | New |
| docs/decisions/0030-google-calendar-readonly.md | OAuth identity, credential storage and read-only data boundaries | New |
| server/google-signin.js | Sign in with Google: ticket, state, cookie, PKCE, account by Google `sub`, token handed to the app once (ADR 0032) | New |
| server/test/google-signin.test.js | Mocked Google: whole flow, openid email only, bad tokens, wrong cookie or state, expiry, closed sign-ups, limits, no leaks | New |
| docs/decisions/0032-sign-in-with-google.md | ADR: Google sign-in, phone only for calls, calendar stays a separate opt-in | New |
| docs/decisions/0033-calendar-required-after-sign-in.md | ADR: after signing in the calendar step is required; phone and Canvas come later, optional | New |
| docs/decisions/0034-google-name-with-profile-scope.md | ADR: sign-in also asks for the Google name (`profile` scope); the app fills the name only while it is empty | New |
| docs/decisions/0036-jack-redesign-takes-over-the-frontend.md | ADR: Jack's redesign becomes the frontend; what came from him and what was kept | New |
| docs/decisions/0035-google-sign-in-in-default-browser.md | ADR: desktop sign-in opens in the default browser; a blocked window shows "Open in browser" | New |
| frontend/concentr8-signin.js | Sends a signed-out student to Google on start (ADR 0038, 0040); its "Continue with Google" page is the fallback and cannot be closed; continues in the browser when no window can open (ADR 0035). AI generated | New |
| server/test/calendar-availability.test.js | Pure availability boundaries and conflict tests | New |
| docs/decisions/0029-calendar-availability.md | Working hours, task estimates and availability semantics | New |
| frontend/calendar-tools.js | Dependency-free local date and deterministic quick-add helpers used by CalendarUI and its Node tests | New (ADR 0028) |
| server/test/chat-history.test.js | Node tests for chat-history.js: restore and clean saved chats, switching, titles | New |
| server/test/chat-scroll.test.js | Node tests for chat-scroll.js with a fake log and fake animation frames | New |
| frontend/test/chat-history.test.js | VM regression tests for saved chats, drafts, in-flight replies, reset and Quick Start; mocked storage and fetch; included in server npm test | Restored |
| frontend/test/chat-scroll.test.js | Regression tests for layout-aware scrolling, resize, hidden views and cleanup using fake frames and observers; included in server npm test | Restored |
| server/test/calendar-tools.test.js | Node built-in tests for calendar date boundaries and quick-add valid, invalid and ambiguous input | New |
| docs/decisions/0028-calendar-redesign.md | Calendar-only design, parsing, timezone and read-only external-event boundaries | New |

## How a call happens (target flow)
1. User agrees to calls and picks days and a time. The API stores the schedule
   with the time of consent (works today, in memory).
2. The scheduler fires at that local time.
3. service.py checks the rules, asks Claude for a short script, asks the
   provider to place the call, stores only the status.

## Where to read next
- Calendar changes and setup: docs/plans/google-calendar.md and server/README.md.
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
| docs/decisions/0037-jack-warm-design-2026-11-04.md | ADR: Jack's warm design of 2026-11-04 merged the way ADR 0036 describes | New |
