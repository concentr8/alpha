# Plan: sign in with Google, calendar access required

Status: PARTLY BUILT. The server sign-in is merged (PR #34, ADR 0032) with its own routes `/auth/google/...` and `openid email` only.
The calendar rule is decided in ADR 0033 (2026-11-03): required, as a second step right after signing in. Where this plan says
"one consent screen" or "four scopes", ADR 0032 and 0033 win. Still open: the sign-in page and calendar step in the app,
the Google settings (`GOOGLE_SIGNIN_REDIRECT_URI` in Azure and the second redirect URI in the Google client), switching off `/api/register`.
Purpose: read by the team before building; replaces phone number plus invite code as the way in.

## Goal
Every student signs in with Google. No invite code, no phone number first, no manual invitations.
Signing in also gives Concentr8 read-only access to their Google Calendar. Without the calendar the sign-in does not finish.

## What exists today (read from the code, 2026-11-03)
- Sign-up is `POST /api/register` in `server/index.js`: phone number plus invite code (`REGISTER_CODE`),
  or no code with `OPEN_SIGNUPS=true`. The server answers with a Concentr8 Bearer token (hashed in `data.users[id].tokenHash`).
- Google OAuth exists only for the calendar (`server/google-calendar.js`, ADR 0030): scope `calendar.readonly`,
  needs an existing Bearer account, one-time ticket, state, cookie binding, PKCE, encrypted refresh token.
- The account key is the phone number (`userByPhone`). Calls need a phone number and consent.

## Design
1. **One consent screen, four scopes:** `openid`, `email`, `profile`, `calendar.readonly`.
   The student sees Google once and the calendar is connected at the same time.
2. **New routes** (same file `google-calendar.js`, same callback URL, so no new redirect URI in Google):
   - `POST /google/signin/start` `{claimHash}` (no account needed): returns `{authorizationUrl}` for a popup or the system browser.
     The app made a random `claimSecret` and sends only its SHA-256 as `claimHash`.
   - `GET /google/callback` (existing): state now carries `kind: 'signin'`. Same checks as today (state, cookie, PKCE) plus a nonce.
   - `POST /google/signin/claim` `{claimSecret}`: the app polls it; once the callback succeeded it returns the Concentr8 token once.
     No token ever travels through the browser URL or the popup.
3. **Who is the student:** the Google account id (`sub`), never the email address. The server reads it from the token response
   it got directly from Google, and checks issuer, audience, expiry, nonce and `email_verified`. No new dependency (plain `fetch`).
   First sign-in creates the student (`newUser`), later sign-ins find them by `sub` and issue a new token (as `/api/register` does today).
4. **Calendar is required:** Google lets people untick a scope. If the answer lacks `calendar.readonly`, no account is created
   (or the sign-in is refused for an existing one) and the app shows: "Concentr8 needs your calendar to plan your day."
   The existing check that rejects extra scopes is widened to exactly these four.
5. **Phone number becomes optional,** asked later under the Calling feature (ADR 0025), together with the call consent.
   Calls are never placed without number and consent. `userByPhone` stays only for the calling code.
6. **Sign-up limits stay:** `MAX_SIGNUPS_PER_DAY` applies to new Google accounts. `OPEN_SIGNUPS`, `REGISTER_CODE`, `RECOVERY_CODE`
   stop mattering for the app once `/api/register` is switched off (step 7).
7. **Disconnect and delete:** `DELETE /api/me` also revokes the Google token (best effort, as disconnect does today).
   Disconnecting the calendar alone is no longer possible in Settings, because the calendar is required. The dialog keeps the calendar choice (max three).

## Data
New fields per student: `googleSub`, `email` (shown in Profile, never logged), `googleCalendar` as today. Existing students are untouched.

## Frontend (needs a human agreement, `frontend/index.html` is frozen)
A sign-in screen with one "Continue with Google" button and one short sentence about the calendar.
No wireframe from Jack yet, so it is built from existing classes and marked "AI generated".
Home without sign-in keeps the 12 free chat messages (guest chat plan).

## Google Cloud, human steps (cannot be done in code)
- Consent screen: **External**, then **In production**. In "Testing" only listed test users can sign in and refresh tokens expire after 7 days.
- `calendar.readonly` is a sensitive scope: Google verification is needed for public use. Before it is approved, students see an
  "unverified app" warning and the number of users is capped (I believe 100; to check in Google's current docs).
- Verification needs, as far as I know: a public home page and privacy policy on a domain we own (concentr8.github.io is a candidate),
  a scope justification and a demo video. To check in Google's docs before we start.
- The redirect URI stays `GOOGLE_REDIRECT_URI` (ends `/google/callback`). School accounts may block third-party apps (see ADR 0030).

## Open questions for Jonas
1. **Existing phone-only students:** keep them working and offer "Connect Google" in Settings, or require Google for everyone at once?
2. **`/api/register`:** switch it off right away (step 7) or keep it for the owner and tests only?
3. **Other devices:** a new sign-in issues a new token and logs out the old Mac, as today. Keep that?
4. **Non-Google people** (no Google account, school mail without Google) cannot join. Accept that?

## Steps (each a small PR, after the go)
1. ADR 0031: Google account is the identity, supersedes the "no separate account system" line of ADR 0030.
2. Server: sign-in routes, scope check, claim flow, tests with mocked Google (state, cookie, PKCE, nonce, replay, expiry, missing calendar scope, second sign-in, per-student isolation).
3. Phone number optional in the calling code, tests.
4. Frontend: sign-in screen (AI generated), 1440px and 390px screenshots before/after.
5. Docs: `docs/architecture.md`, `server/README.md`, `.env.example` (no new names expected).
6. Human: Google consent screen, verification, deploy.
7. Switch off `/api/register` once all of the above works.

## Build: sign-in page and calendar step (go given 2026-11-03)
- `frontend/concentr8-server.js`: `Concentr8.signIn()` (poll flow: `POST /auth/google/start`, open the Google window, poll `POST /auth/google/token`, save the token), `signOut()`, `isSignedIn()`. Chat hint says "Continue with Google".
- New `frontend/concentr8-signin.js` (AI generated, built from `cal-dialog`, `.wire-button`, `.preview-note`): one sign-in dialog with the Google button; after signing in, a calendar step that cannot be closed (ADR 0033): "Connect Google Calendar" (`POST /google/login`, window, check `GET /google/calendars`) and "Sign out". Without the step the app shows only this dialog.
- `frontend/index.html`: one `<script>` line and a sign-in / sign-out entry on Profile, Account.
- `server/index.js`: free-message limit text says "Continue with Google".
- Not in this PR: server-side refusal of data routes without calendar, switching off `/api/register`.

## Verification
`cd server && npm test`. Live consent cannot be tested without the real Google configuration and a real account.

## Update 2026-11-03: sign-in must be visible
Jonas: signing in with Google on the web version is very important, and "Personal information" alone made no sense. The Profile page and Profile, Personal information now show "Continue with Google" (or "Sign out" when signed in); "Account & subscription" is renamed "Sign in & subscription". Still to decide with Jack: a sign-in entry in the sidebar.
