# 0032. Students sign in with Google, the phone number is optional

Status: Accepted (Jonas, 2026-11-03). Plan: `docs/plans/chat-interview-and-google-login.md`. Source: Linear CON-53 item 7.
Purpose: explains the sign-in design to server maintainers. Supersedes the phone sign-up part of ADR 0022 once the app uses it.

A student signs in with a Google account (any, school accounts too). The phone number is no longer needed to log in; it
is only needed for calls and is asked for in Settings, together with the agreement to calls (`POST /api/settings`
needs `consent: true` for the first number).

Sign-in asks Google for `openid email` only. Calendar access stays a separate opt-in (ADR 0030) and sign-in never grants
it. No refresh token is requested and nothing of Google is stored except the account id (`sub`) and the email.

Flow (`server/google-signin.js`, routes `/auth/google/...`): the app sends a random poll code, opens the address it gets
back, and asks with the poll code until the browser part is done; the token is handed over once. This works for the web
app and the desktop app without a token in an address. Same safety rules as ADR 0030: state, a cookie that ties the
callback to the same browser, PKCE, five minute expiry, no provider errors shown.

The account follows the Google `sub`, not the email (an email can change at Google, the `sub` cannot); the email is kept
up to date. The server accepts the sign-in only when Google says the email is verified, the token is for our client, and
it has not expired. The id_token comes straight from Google's token endpoint over TLS, so its signature is not checked
(OpenID Connect allows this); every other claim is.

Decisions: old phone-only accounts are not linked, everyone starts fresh with Google (Jonas). New students need
`OPEN_SIGNUPS=true` and count towards `MAX_SIGNUPS_PER_DAY`; students who exist can always sign in. A new sign-in
replaces the old token, like `/api/register`.

Not done here: the app (Sign-in button, polling; Jack and a plan edit because `frontend/index.html` is frozen), removing
`/api/register` once the app has switched, and several devices at once (one token per student, TODO).
