# 0033. The calendar is required, right after signing in

Status: Accepted (Jonas, 2026-11-03). Changes one rule of ADR 0032 ("calendar stays a separate opt-in").
Purpose: tells the team what a signed-in student must do before the app opens.

Every student connects their Google Calendar. The order stays two steps, so signing in itself stays small:
1. Sign in with Google. Still `openid email` only (ADR 0032, `server/google-signin.js`).
2. Straight after, the app opens the calendar step (the connection of ADR 0030, `calendar.readonly`, up to three calendars).
   Until a calendar is connected the app shows only this step and a way to sign out. Nothing else opens.

What stays as it is: read-only access, encrypted refresh token, no events stored on the server (ADR 0030).
What changes: the app treats "no calendar connected" as "not finished", not as a normal state.

Later and optional, not part of this decision: the phone number (calls) and a student's own Canvas token.

Consequences we accept:
- A student whose school account blocks third-party apps, or who unticks the calendar in Google's dialog, cannot use the app.
  The step explains why and offers to try again or to use another Google account.
- `calendar.readonly` is a sensitive Google scope. Public use needs Google's verification; until then students see an
  "unverified app" warning and the number of users is capped (the console shows 100).

Not decided yet: whether the server also refuses data routes for a student without a calendar, or only the app gates.
Proposal: the app gates first; `GET /api/me` reports `calendarConnected` so the app and later the server can use it.
