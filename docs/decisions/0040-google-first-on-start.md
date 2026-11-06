# 0040. A signed-out student goes straight to Google

Status: Accepted (Camila, 2026-11-05). Builds on ADR 0038 and changes how it works; ADR 0032 (poll code) and 0035 stay.
Purpose: explains why the web app leaves for Google on start and how the student gets back.

## Problem
ADR 0038 opened Concentr8's own "Continue with Google" page on top of the app. Students should see Google's page first.
A browser blocks a small window that no click asked for, so the web app cannot open one on start.

## Decision
- Web app: on start the whole tab goes to Google. The poll code of ADR 0032 waits in `sessionStorage`, and `POST /auth/google/start`
  gets a `returnTo` address. After Google the server sends the tab back there, and the app collects the token with its poll
  code. The token never travels in an address.
- The server only goes back to `https://concentr8.github.io` or `localhost`. Anything else is ignored and the student sees
  the old "close this window" page, so a link cannot send students to another site.
- Desktop app: on start Google opens in the default browser (ADR 0035), no click needed.
- The app stays hidden until Google opens, so there is no flash of it.
- Concentr8's page stays as the fallback: when the server cannot be reached, or the student comes back without signing in.
  It never goes back to Google by itself, so a student who cancels cannot end up in a loop.

## Consequences we accept
- Every start without a sign-in leaves the page, also after signing out.
- While the server wakes up the student sees an empty page for a few seconds.
