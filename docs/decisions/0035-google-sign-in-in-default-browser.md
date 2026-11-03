# 0035. Google sign-in continues in the browser when no small window can open

Status: Accepted (Jonas, 2026-11-03). Builds on ADR 0032 (sign in with Google) and ADR 0033 (calendar step).
Purpose: explains why the desktop app sends Google to the default browser, and what the web app does when a popup is blocked.

## Problem
The app opened an empty window (`about:blank`) during the click and gave it the Google address once the server answered
(browsers allow new windows only during a click). In the desktop app, `app/main.js` sent every new window to the
default browser, including `about:blank`. macOS then asked "There is no application set to open the URL about:blank",
and the app showed "Allow the sign-in window to open, then try again.", which nobody could act on. The same happened in
the calendar step after sign-in, so a desktop student could not get into the app at all.

## Decision
- Desktop app: no empty window. Google opens in the default browser (`shell.openExternal`), the app keeps asking the
  server with its poll code (ADR 0032) and signs in by itself. We chose this over a second app window (Jonas): the
  student sees the real browser address, password managers and existing Google sessions work, and there is no deep link
  to build. `app/main.js` hands only `http:` and `https:` addresses to the browser (`app/desktop/links.js`); everything
  else is refused quietly.
- Web app: the small window stays. When the browser blocks it, the dialog says "Sign-in window was blocked. Click to
  open it in your browser." with an "Open in browser" button. The click opens the Google address in a new tab.
- Google links work once (the server deletes the ticket), so the button disappears after the click. A new click on
  "Continue with Google" starts a new attempt and stops the older one.
- Calendar step and Google Calendar settings: same behaviour. Without a window of our own we cannot see it close, so the
  app checks the calendar again when the student comes back to Concentr8 (window `focus`).
- The status line in the sign-in dialog has the same size as the text above it, 8px below it (Jonas).

## Not done
The calendar settings and sign-in dialog have no wireframe from Jack (AI generated). The 8px gap is an inline style in
`frontend/concentr8-signin.js`, because `frontend/index.html` is frozen; Jack can move it into a class when he redraws.
