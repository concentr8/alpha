# Plan: a demo link that works without a Google account

Status: BUILT on Jonas's go (2026-11-06) for the Cal demo. Camila still to confirm, because it narrows her ADR 0038.
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
5. The desktop app has no address bar: start it with `--demo` (`app/main.js` then loads the page with `?demo`).
6. In demo mode the chat answers "I have three assignments due, where should I start" with a fixed answer, no server and no
   Claude key needed: three to-dos (Computer Vision, Microeconomics, Rhetoric essay) with minutes, due dates and four small
   steps each. Any other message goes to the normal chat. It cannot fail on stage.
7. Files: new `frontend/concentr8-demo.js` (+ `frontend/test/demo.test.js`), small changes in `concentr8-signin.js`,
   `concentr8-server.js` (the fixed answer, steps and course on a to-do from the chat) and `app/main.js`.
   `frontend/index.html` (frozen) gets one script tag, `concentr8-demo.js`, as this plan says.

## Decisions needed
- **A. `?demo` link (recommended).** Hidden from normal students, no UI change.
- **B. "Try the demo" button on the sign-in page.** Visible to everyone; needs a button, so a redraw by Jack.
- Chat in demo mode: the fixed answer above needs no server. Other messages use the guest chat (10 per day), which has
  not been reachable since ADR 0038 and is NOT tested here.

## Tests
- `frontend/test/`: with `?demo` the Google page does not open and the tab is not sent to Google; without it, as before;
  signing in or out inside a demo works as before.
- By hand: demo link in a fresh browser profile on the web, then the normal link still asks for Google.
