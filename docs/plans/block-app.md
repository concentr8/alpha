# Plan: Block App, notifications and AI check in the desktop app

Status: "go" from Jonas (2026-10-28): take the working backend of the old Mac app, build missing pages in Jack's style.

## Goal
During a focus session the Mac app closes distractions and sends the student back to work. An AI check makes sure
that what is on the screen fits the task. This is the part of the old weekend app that worked, now inside Jack's app.

## What the student sees
1. Block App page (Jack's page, unchanged): the block list and presets.
2. New on that page (AI generated, `.preview-note`): one line on when blocking runs, "How it works", a switch "Let AI
   check that my screen fits my task", a button "Test notification and permissions".
3. In the web version the same place says: blocking works only in the Mac app.
4. During a session: notification "Back to: <task>", 15 seconds, then the tab is closed (browser goes back to the last
   work page) or the program is hidden. Breaks and paused sessions are never blocked.

## Why this structure (not the weekend structure)
- The old app had its own blocker window and settings. Now the list lives on Jack's Block App page and blocking is part of
  the Block App tool of a session. One place, no second screen.
- No separate "permissions" page: the test button shows a notification and triggers the macOS permission question
  at a moment the student chose.

## How it is built
- `app/desktop/` (plain JavaScript, no new dependency): rules, apps (names to rules), platform (AppleScript),
  relevance (plain rules first, then Claude through `/api/relevance`), blocker (the loop), bridge (Electron side).
- `app/preload.js` gives the page `window.concentr8Desktop` (start, stop, pause, test, status). Nothing else.
- `frontend/concentr8-blocker.js` watches the session and the block list and calls the bridge. Jack's focus code is not changed.
- `frontend/index.html`: two lines (script tag, panel on the Block App page).

## Safety
- The bridge accepts only an `https://host` server address and a string token; the token is sent only to `/api/relevance`.
- AppleScript text is escaped; page titles can not run code.
- No API key in the app. Only app name, page title, host/path/search query go to the server, only for pages the list cannot judge.

## Not in this change
- Windows and Linux blocking (a null platform sees and blocks nothing; the page says so).
- Canvas task links ("open the assignment") and the "I'm stuck" calm screen from the old app.
- Real Mac test: needs a Mac; macOS permissions cannot be tried in CI.

## Check
- `npm test` in `app/` (14 tests: rules, AppleScript text, AI check, loop with fake screen and clock).
- Browser test of the page with a mocked desktop door (web, Mac, Windows/Linux note).
