# 0030. Google Calendar is read-only and owned by each student

Status: Proposed for review.
Purpose: explains the OAuth/storage boundary to server and calendar maintainers.

Use the existing Concentr8 Bearer identity, not a separate account system or
the developer's personal Google integration. The latter would connect one
developer's account rather than each student's own calendar.

Request calendar.readonly only. The browser receives a one-time launch URL,
never a Google credential. A first-party cookie binds the OAuth state to the
browser doing consent; PKCE binds the code exchange. Tickets and states expire,
are one-use, are bounded in memory and are invalidated by disconnect/reconnect.
Callback output is fixed text without user identifiers or provider errors.

Refresh tokens are encrypted with AES-256-GCM and the user ID as associated
data in the existing per-student server record. The key lives only in env.
Access tokens stay in memory; no new database or dependency. Changing the
encryption key requires reconnecting. No credentials in logs or frontend.

Only three calendars may be selected. Validate selections against that
student's accessible calendar list. Follow pagination and expand recurrences;
fail explicitly rather than offer availability from an incomplete event list.
Cancelled events are omitted. Read-only event objects are in browser memory,
not local tasks, and no Google mutation API exists.

Convert timed events into the requesting student's validated browser timezone;
all-day dates retain the provider's date/exclusive end. Fetch the visible
range plus seven days for availability. Keep loading/error/stale status
explicit; stale provider data cannot be used to claim a free slot.

Missing env disables only Google. Human actions still required: configure
the Google project, enable Calendar API, exact redirect URL, consent-screen
settings/verification as applicable, and test a real school account. If a
school blocks OAuth, the future private ICS option is documented, not built.

Profile Settings gains only a runtime dialog entry. Other page source stays
unchanged under the calendar-only exception. All new design is AI generated.
