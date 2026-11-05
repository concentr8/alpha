# Plan: the Google sign-in page opens when a student starts the app

Status: ACCEPTED. Camila chose option A on 2026-11-05 (ADR 0038).
Purpose: read by the team before building; makes "Continue with Google" the first thing a new student sees.

## Goal
A student who opens Concentr8 and is not signed in sees the Google sign-in page first, in the web app and in the
desktop app. After signing in, the app opens. Changed 2026-11-05: no calendar step any more (ADR 0039).

## What exists today (read from the code, 2026-11-05)
- Sign-in with Google is built: server `server/google-signin.js` (ADR 0032), app `frontend/concentr8-signin.js`,
  browser hand-off in the desktop app (ADR 0035).
- The sign-in page opens only from Profile, Account (`data-signin-open`) or `Concentr8Signin.open()`.
  It opens by itself only for a signed-in student without a calendar.
- A visitor who never signs in can use the app, and the AI chat as a guest (docs/plans/guest-chat.md, 10 messages per day).

## Design
1. When the app loads and `window.Concentr8.isSignedIn()` is false, `concentr8-signin.js` opens the sign-in page.
   Same page, same texts, same buttons: nothing new to draw.
2. A student who is already signed in sees nothing new.
3. After signing out, the sign-in page opens again.
4. Files: `frontend/concentr8-signin.js` only. `frontend/index.html` (frozen) does not change.
   `docs/architecture.md` lists this plan. A new ADR records the decision below.

## Decision needed
Can a student close the page and keep using the app as a guest?
- **A. Required (recommended, matches "sign in as they start").** The page cannot be closed (no ×, Escape blocked, like the
  calendar step). The guest chat is then never reached in the app; the server route stays until a cleanup PR. Needs an ADR
  that supersedes the guest part of docs/plans/guest-chat.md.
- **B. Skippable.** The page opens on start but has a "Not now" link; the guest chat stays as it is.

## Consequences
- The web demo (concentr8.github.io/alpha) also asks for Google first, so a demo needs a Google account (option A).

## Tests
- `frontend/test/`: signed out on load opens the page; signed in does not; option A blocks close and Escape.
- By hand: web app and desktop app (Windows), fresh profile, sign in, app opens; sign out, page is back.
