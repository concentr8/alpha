# Plan: a demo link that works without a Google account

Status: PROPOSED. Needs a "go" from Camila (she accepted ADR 0038) before any code is written.
Purpose: read by the team before building; lets people try the app at Cal without signing in.

## Goal
Someone who opens the demo link sees the app straight away, with no Google page. Real students still must sign in (ADR 0038).

## What exists today (read from the code, 2026-11-06)
- `frontend/concentr8-signin.js` sends every signed-out visitor to Google on start and cannot be closed (ADR 0038, 0040).
- The web demo (concentr8.github.io/alpha) is the same app, so a demo needs a Google account (consequence of ADR 0038).
- Demo data already exists for Canvas (`demoCourses` in `frontend/index.html`).

## Design (option A, recommended)
1. A link with `?demo` at the end (concentr8.github.io/alpha/?demo) switches demo mode on for this browser tab only
   (sessionStorage). No new button, no new layout: nothing for Jack to draw.
2. In demo mode `concentr8-signin.js` does not go to Google and does not open its page. Everything else stays as it is.
3. Without the link nothing changes: the sign-in is still required.
4. Data stays in this browser like today. Parts that need an account (Google Calendar, the call) keep their
   "Sign in to ..." message.
5. Files: `frontend/concentr8-signin.js` only, plus a test in `frontend/test/signin.test.js`.
   `frontend/index.html` (frozen) does not change.

## Decisions needed
- **A. `?demo` link (recommended).** Hidden from normal students, no UI change.
- **B. "Try the demo" button on the sign-in page.** Visible to everyone; needs a button, so a redraw by Jack.
- TO CHECK before building: does the AI chat work in demo mode? The guest chat route still exists on the server
  (`POST /api/chat/guest`, 10 messages per day) but the app no longer reaches it (ADR 0038).

## Tests
- `frontend/test/`: with `?demo` the Google page does not open and the tab is not sent to Google; without it, as before;
  signing in or out inside a demo works as before.
- By hand: demo link in a fresh browser profile on the web, then the normal link still asks for Google.
