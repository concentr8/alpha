# ADR 0034: Sign-in also asks for the Google name (`profile`)

Status: accepted 2026-11-03 (Jonas). Changes one line of ADR 0032 ("`openid email` only"); the rest of 0032 and ADR 0033 stay.

## Decision
- Sign-in asks for `openid email profile`. `profile` is a basic, non-sensitive scope (no Google verification needed). It adds the display name to the ID token.
- The server keeps the name as `googleName` and returns it from `GET /api/me`, next to the email.
- The app fills "Name" in the profile from it only while the name is empty. A name the student typed is never overwritten. We do not use Google's profile picture: students choose their own (Jonas, 2026-11-03).
- Calendar access stays a separate opt-in (ADR 0030, 0033).

## Consequences
- Google Console: add `.../auth/userinfo.profile` under Data access. The privacy policy names the Google name.
- Students who signed in before this change get the name the next time they sign in.
