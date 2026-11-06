# 0039. The calendar is optional, so sign-in is Google's standard page

Status: Accepted (Camila, 2026-11-05), for Jonas to review in the pull request. Supersedes ADR 0033.
Purpose: tells the team why the calendar step after sign-in is gone. ADR 0030 (how the calendar connects) stays as it is.

## Problem
The forced calendar step asks Google for `calendar.readonly`, a sensitive scope. Until Google has verified the app, that
step shows "Google hasn't verified this app" to every new student. Sign-in itself asks for `openid email profile` only
(ADR 0034), which Google shows as its normal account page, without the warning.

## Decision
- Students sign in and the app opens. There is no calendar step after signing in.
- Google Calendar stays available as an opt-in under Profile, Settings (`frontend/concentr8-google-calendar.js`). The
  calendar page already says "Connect Google Calendar in Profile Settings" when nothing is connected.

## Consequences we accept
- A student without a connected calendar gets no plans around their real day until they connect it.
- A student who connects it in Settings still sees the warning until Google verifies the app. Verification stays worth
  doing, and the calendar can become required again after it.
