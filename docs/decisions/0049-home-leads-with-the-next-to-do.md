# 0049. Home leads with the next to-do

Status: Accepted (2026-11-10). Changes ADR 0036 (the landing view and "Quick Start") and follows ADR 0026 (a clean start).
Plan: `docs/plans/simplicity-redesign.md`, PR 4. Decisions behind it: ADR 0045.

## Context
Home named no task (0 of 13 controls), the fastest way into a focus session was Toolbox, Timer, Start (3 clicks), the
main button "Quick Start" opened an AI interview, starting a timer created a to-do called "Focus session", and a
returning student landed in yesterday's chat (audit A1, A4, A5, A7, A8, A12, A13).

## Decision
- `frontend/home-next.js` draws, under the greeting: the **Next card** (the most urgent open to-do) with the page's one
  filled button "Start focus 25 min" (Settings, Default focus minutes), which starts the session for that to-do in one
  click; two more to-dos as rows; an add row (`N` focuses it); "All to-dos (n)".
- Order: by deadline (so overdue first, oldest first), then to-dos without a date in the order they were added. A running
  session's to-do is always the card, labelled "Now", with the time left.
- Due dates are words in the device's time zone and language: "Due today, 5:00 PM", "Due tomorrow", "Due Fri",
  "Overdue since yesterday", "Overdue 3 days", "No date".
- Tick, add and delete show a note with Undo; the rows stay where they are until the student's next action, so the
  pointer never lands on a different to-do. Delete has no confirm dialog.
- Rows have a visible checkbox and a ⋯ menu (Start focus, Edit, Delete); a swipe to the right on a touch screen is only
  an extra (WCAG 2.5.7, ADR 0045).
- One name for the action: "Start focus". "Quick Start" becomes the chip "Plan a session" with the same behaviour.
- Every app start opens Home in a fresh chat; the last chat keeps its messages and draft and is one click away under the
  chat switcher. Inside a chat the card shrinks to one line and stays on top.
- A focus session without a to-do creates none (`ensureTask` returns null instead of "Focus session").

## Consequences
- Task b of `docs/design/baseline.md`: 1 click (was 3). Task c: 1 click or `N` (was 2 and a page change). Task d: the card
  names the next to-do. Task e: Home with the Next card instead of yesterday's chat.
- Home has more controls than before (about 18 instead of 13) but one filled button.
- `frontend/test/chat-history.test.js` now expects a fresh chat after a reload.
