# Read-only Google Calendar

Purpose: approved package 3 plan, committed before code; read by the team and
implemented by the existing Node server and a calendar-only browser adapter.
No dependency. No Google write endpoint or write scope.

## Server contract
- GET `/google/status`: `{configured}` only, safe before Concentr8 sign-in.
- POST `/google/login` with existing Bearer account: `{authorizationUrl}`.
  A one-time launch ticket opens GET `/google/login?ticket=...` in a popup.
  That first-party page binds an HttpOnly, SameSite=Lax cookie to the pending
  OAuth state, redirects to Google, uses PKCE, expires after five minutes.
- GET `/google/callback`: consume state once, compare browser cookie, exchange
  code with plain fetch. Only `https://www.googleapis.com/auth/calendar.readonly`.
  The callback shows a fixed success/failure page; no tokens or identifiers.
- GET `/google/calendars` authenticated:
  `{configured,connected,calendars:[{id,name,selected}],selectedIds,timezone}`.
- POST `/google/calendars` authenticated `{calendarIds:[...]}`: validate IDs
  against the provider's list, at most three, store per student.
- GET `/google/events?from=&to=&timezone=` authenticated: RFC3339 instants with
  offsets, exclusive `to`, maximum 62 days. Return
  `{events:[{id,calendarId,title,start,end,allDay,kind:"google",readOnly:true,notes}],
  calendars:[{id,name}],updatedAt,timezone}`. Event dates are floating wall
  times in the validated requested/browser timezone (fallback to user zone).
  All-day dates remain dates, including exclusive end. Follow pagination and
  expand recurring events; omit cancelled instances. Bounded failure is an
  explicit error, never silent truncated availability.
- POST `/google/disconnect`: remove encrypted token, selections and pending
  authorizations immediately, revoke with Google best-effort.

Use current account authentication, not a new login system. Refresh tokens
encrypted with AES-256-GCM, user ID as authenticated context, in the existing
server-side data file. Access tokens only in memory. Never return, log or
commit OAuth credentials. Store state/tickets in bounded expiring memory;
disconnect invalidates in-flight authorization and refresh work.

Env names only: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
TOKEN_ENCRYPTION_KEY (32 random bytes as 64 hex characters). HTTPS callback
required outside local development. Missing/invalid setup disables Google
only. Setup, consent-screen publication and school admin approval need humans.

## Frontend contract
One new script adjacent to calendar.js, no edits to other pages. Add a button
at runtime only to existing Profile > Settings; it opens an AI-generated
dialog built from cal-dialog, cal-field, wire-button and preview-note classes.
Use `Concentr8.connection()` for existing identity and server address.
No OAuth tokens in browser state; existing Concentr8 token stays as it is.

Connect opens the server-provided one-time launch URL. Poll connection after
popup closes; no cross-window credentials. Show calendars with max-three
selection, save, disconnect and explicit error/loading states.

On calendar range changes fetch visible range plus the next seven local days
for availability, even when browsing a distant month. Refresh at most every
five minutes and on focus; cancel outdated range requests, clear account
scoped data on logout/switch. Keep external data in memory only through
CalendarUI.setExternal. On failure retain last data marked stale, never show
it as fresh. Failed/loading connected data blocks availability suggestions.
Tasks and each Google calendar get filter chips above the grid; Google
events remain read-only, dashed and grey with sage border and Google label
in details. Local tasks always work without setup.

## Verification and open questions
Unit/integration tests mock Google with plain fetch: disabled config, auth,
state/cookie/PKCE/replay/expiry, encryption, per-student isolation, max-three
selection, refresh, recurrence pagination, timezone/DST/all-day dates, ranges,
disconnect races and provider errors. Run existing server tests.
1440px/390px screenshots of calendar and Settings before/after with demo data.
Live consent cannot be verified without the real server configuration.

School accounts may block third-party apps. Future fallback (plan only):
accept the private iCal/ICS feed address as a per-user encrypted read-only
source, with URL/SSRF protection and secret redaction. Do NOT build it tonight.
