# 0036. Jack's redesign of 2026-11-03 becomes the frontend

Status: Accepted (Jonas, 2026-11-03). Source: Jack's local snapshot `Concentr8-2026-11-03-local.html`.
Purpose: records what came from Jack, what was kept from the work done meanwhile, and which older decisions change.
Supersedes parts of ADR 0027 (stored chat, Toolbox in the sidebar, quiet Home marker) and the Quick start of CON-38.

## Context
Jack redesigned the whole interface on top of `main` as of 2026-10-31 (commit 6b8d819) and sent one self-contained
HTML file. Meanwhile `main` got Google sign-in, time estimates and due dates from the chat, a profile picture, a minimal
Start focus dialog and a Quick start button. Rule from Jonas: for the frontend, Jack's version always wins, above all
for Quick Start; the features built meanwhile are added on top where they do not clash.

## Decision
`frontend/index.html` is Jack's file, block for block. Only these things differ from his snapshot:
- His bundled copies of `concentr8-server.js`, `concentr8-blocker.js`, `calendar-tools.js`,
  `concentr8-google-calendar.js` are `<script src>` again; his new `chat-history.js` is its own file with Node tests.
- The music is loaded from `frontend/music/` (his base64 copies are byte-identical); the snapshot note at the end is gone.

From Jack (kept as he drew it):
- **Several chats** with a chat switcher, history grouped by day, search from six chats on. Chats are **stored in the
  browser** and come back after a reload (this reverses "no stored chat" of ADR 0027). Each chat waits for its own answer.
- **Quick Start**: opens a focus chat that plans the session (what to finish, how much time), then "Start focus
  session" opens the Start focus dialog for that task. It replaces the one-click "Quick start · 10 min" (CON-38).
- **Home**: "What's on your plate right now?", no Up next row, no to-do side panel, the AI button is hidden on Home.
- **Sidebar**: Home, Courses, Toolbox, To Do List, Data, Calendar. To Do List and Data are pages of their own;
  `#profile/data` and `#toolbox/checklist` still land there.
- **Calendar**: one toolbar (Today, arrows, range, Calendars, + New, Day/Week/Month); no quick-add field, no go-to-date
  field, no shortcut letters, no Tasks chip.
- Voice: no Shift shortcut; texts say "click the microphone".
- No visible "AI generated" note on pages he has now drawn: Phone call, Reset all data, Block App, Google Calendar.

Kept from the work done meanwhile (added on top, marked AI generated where Jack has no drawing):
- Google sign-in (ADR 0032, 0033, 0035): sign-in page, Continue with Google on Profile, Personal information and
  "Sign in & subscription", email and name from Google.
- Time estimate and due date from the chat (CON-35): shown in the chat line, on the To Do List, in Find study time;
  the due date becomes a deadline. This also works for Jack's automatic to-do adds, and the estimate now survives a
  reload (it was dropped before).
- Profile picture (sidebar, Profile, Personal information), stored in the browser only.
- Minimal Start focus dialog with "Advanced". Jack's "Start focus session" passes the chat's task to it.
- Guest chat fallback when the saved login is gone; the privacy text now says 10 free messages, like the server.

## Consequences
- Chats are personal data in the browser now: "Reset all data" and Export include them; the server still keeps none.
- `parseQuickAdd` in `calendar-tools.js` has no button any more; it stays because its tests document the rules.
  TODO: remove it, or bring the quick-add back, once Jack decides.
- Jack's file still has CSS for the removed to-do panel (`.add-task-form` and others). Left as he sent it.
