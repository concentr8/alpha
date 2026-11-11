# 0048. First start in three steps; calendar step right after sign-in

Status: Accepted (2026-11-10). Changes ADR 0039 (no step after sign-in). Plan: `docs/plans/simplicity-redesign.md`, PR 3.
Decisions behind it: ADR 0045 (quiet "Not now", no visible AI note).

## Context
A new student saw a blank page, then Google, then a Home with an open question and three fake to-dos; the calendar was
four levels deep in Profile, Settings (audit A2, A3, A6, A11). ADR 0039 had removed a calendar step after sign-in
because Google shows "Google hasn't verified this app" for the calendar permission.

## Decision
1. **Signing in** (`frontend/concentr8-signin.js`): while the server wakes up, the brand and "Opening Google sign-in…"
   fill the window instead of a blank page. When Google cannot open, the same screen shows plain words, an error box
   and "Continue with Google". No "AI generated" note. In the desktop app the main button becomes "Open Google again".
2. **Calendar** (`frontend/onboarding.js`): "Step 2 of 3", one reason, "Connect Google Calendar" and a quiet "Not now".
   After connecting, the calendar whose id is the account email (otherwise the first) is selected and saved without a
   click. Failure shows "The calendar did not connect…" with "Try again". Escape means "Not now". Settings keeps the
   full dialog. The calendar stays optional while Google's warning exists (ADR 0045); ADR 0039's reason still holds.
3. **First to-do**: "What is the one thing you need to get done?" with one focused field. Enter creates the to-do in the
   browser at once, then the same words start the first chat (ADR 0031 asks its questions there).
4. Each step shows once per browser (`onboarding` in the app state): a connected calendar or an existing open to-do skips
   its step and is remembered; "unknown" (server not reachable) is asked again next time.
5. New accounts start empty: the sample courses, to-dos and calendar blocks appear only in demo mode (`?demo`). Stored
   data of existing accounts is untouched.
6. The three "Continue with Google" buttons in Profile (visible only when signed out, e.g. demo) start the same sign-in.

## Consequences
- Task a of `docs/design/baseline.md`: 1 click inside Concentr8 before typing (was 10), 3 screens (was 8).
- Existing students who never connected Google see step 2 once after this update.
- The step screens are full-window dialogs: nothing of the app shows behind them, and the sidebar is not visible in step 3
  (a deviation from the mockup, which showed it: one job per screen).

## Corrections after testing (Phase 3, `docs/design/test-report.md`)
- While step 2 waits for Google, the keyboard focus rests on the screen, not on "Not now": a second Enter no longer
  skips the calendar by accident.
- When the browser blocks the Google window, step 2 says so and its main button is "Open in browser".
- After the last step the keyboard focus goes to the chat box.
