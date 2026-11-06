# 0042. A demo link opens the app without a Google account

Status: Proposed (waiting for Camila). Plan: `docs/plans/demo-without-google.md`.
Purpose: tells the team that the sign-in requirement has one exception, for demos. Narrows ADR 0038; does not reverse it.

## Decision
- Opening the app with `?demo` at the end of the address skips the Google sign-in for that browser tab.
- Without `?demo`, every signed-out student still goes to Google and cannot close the page (ADR 0038, 0040).

## Consequences we accept
- Anyone who knows the link can try the app without an account. They get no Google Calendar and no phone call.
- The demo link is not shown anywhere in the app.
