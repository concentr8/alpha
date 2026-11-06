# 0042. A demo link opens the app without a Google account

Status: Proposed (built on Jonas's go, 2026-11-06; waiting for Camila). Plan: `docs/plans/demo-without-google.md`.
Purpose: tells the team that the sign-in requirement has one exception, for demos. Narrows ADR 0038; does not reverse it.

## Decision
- Opening the app with `?demo` at the end of the address skips the Google sign-in for that browser tab.
- The desktop app does the same when started with `--demo`.
- In demo mode the chat answers "where should I start" with a fixed answer that adds three demo to-dos with steps. It does
  not call the server or Claude.
- Without `?demo`, every signed-out student still goes to Google and cannot close the page (ADR 0038, 0040).

## Consequences we accept
- Anyone who knows the link can try the app without an account. They get no Google Calendar and no phone call.
- The demo link is not shown anywhere in the app.
