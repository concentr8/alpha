# 0038. Students sign in with Google before the app opens

Status: Accepted (Camila, 2026-11-05). Plan: `docs/plans/sign-in-on-first-open.md`.
Purpose: tells the team that the app has no guest mode any more. Supersedes the "without login" part of
`docs/plans/guest-chat.md`; ADR 0032, 0034 and 0035 stay as they are.

## Decision
- When the app starts and the student is not signed in, the Google sign-in page opens. It cannot be closed (no ×,
  Escape does nothing). After signing out it opens again.
- After signing in the app opens. The calendar is no longer part of this order (ADR 0039).
- Same page, texts and buttons as before (`frontend/concentr8-signin.js`); only the line about free guest messages goes.

## Consequences we accept
- Nobody can try the app without a Google account, also not the web demo (concentr8.github.io/alpha).
- When the server cannot be reached, a signed-out student stays on the sign-in page.

## Not done here
The guest chat code (`POST /api/chat/guest`, the guest id in `frontend/concentr8-server.js`) is no longer reached from
the app. TODO: remove it in a separate cleanup PR.
