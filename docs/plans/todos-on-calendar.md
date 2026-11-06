# Plan: to-dos go on the calendar by themselves, with or without Google Calendar

Status: ACCEPTED. Camila chose option A on 2026-11-05 (ADR 0041).
Purpose: read by the team before building; gives every new to-do a place in the student's week.

## Goal
A student adds a to-do and sees it on the calendar straight away. Google Calendar is not needed. Since ADR 0039 a new
student has no calendar connected, so today their calendar stays empty.

## What exists today (read from the code, 2026-11-05)
- The app has its own calendar, kept in `state.calendarEvents`. It works without Google.
- A to-do only reaches it in three ways: as a deadline when it has a due date, by "Find study time" in the calendar rail
  (the student picks the task and saves each block), or by a chat button (`suggest_calendar`).
- `CalendarTools.findFreeSlot` finds the first free slot: today plus six days, 08:00 to 21:00, in 15-minute steps. It already
  works without Google events. The app's `availability()` only stops it when connected Google data is loading or stale.

## Design
1. When a new to-do is added (To Do List, chat, Canvas import), the app saves a `plan` event for it in the first free slot,
   with the task's id in `taskId`. Same event type as today, so it can be moved, resized or deleted like any block.
2. Length: `task.estimatedMinutes`, else `settings.focusMinutes` (25).
3. Busy times: the student's own events, plus Google events when connected. The app only loads Google events while the
   Calendar page is open, so placement asks for them itself. When they cannot be read, the to-do waits, so nothing lands on a real class.
4. A to-do with a deadline is only placed in a slot that ends before the deadline. A student's week with no room gets
   no block, and the to-do stays on the list. Nothing is ever overbooked.
5. A student's move or delete is final: the app never places that to-do again. Finishing a to-do removes its future block.
6. To-dos that exist before this change are not placed, so nobody's week fills up at once.
7. Connecting Google later does not move blocks. A clash shows on the calendar and the student moves it.

## Files
- `frontend/task-placement.js` (new, tested): which to-dos need a block, and where.
- `frontend/concentr8-google-calendar.js`: `busyEvents()`, the student's Google events of the coming week.
- `frontend/index.html`: one script tag. **This file is frozen; Camila agreed on 2026-11-05.**
- `frontend/test/task-placement.test.js` (new), listed in `npm test`. `docs/architecture.md`, and an ADR for the decision.

## Decision needed
Should a new to-do be placed by itself?
- **A. Automatic (recommended, matches the request).** The block appears at once; the student moves it if they want.
- **B. Ask first.** After adding a to-do the app offers "Add to calendar at Tue 16:00?", and only a click saves it.

## Risks
- A Canvas import of many tasks fills the coming days. Accepted: each one still only takes a free slot.
- Every calendar event made by hand creates a task, so a task with a block already gets no second one.
- `saveEvent` makes the task active, so placement sets the active task back.

## Tests
- `findFreeSlot` overlap rules stay as they are. New: places a new to-do; uses the estimate; respects deadlines; no room means
  no block; waits for stale Google data; never re-places after a delete; removes the future block when done; leaves old to-dos.
- By hand: a new account without Google adds a to-do and sees it on the calendar, on web and desktop.
