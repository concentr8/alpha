# 0041. New to-dos go on the calendar by themselves

Status: Accepted (Camila, 2026-11-05). Plan: `docs/plans/todos-on-calendar.md`. Builds on ADR 0039 and the "Find study time" plan.
Purpose: explains when the app adds a block to a student's calendar without asking, and when it does not.

## Decision
- A new to-do gets a `plan` block in the first free slot (`frontend/task-placement.js`). Google Calendar is not needed.
- Length: the task's estimate, else the student's focus length. Hours and days: those of `findFreeSlot`.
- It is automatic (option A of the plan), so there is no new control. The student moves or deletes the block like any other.

## Rules that protect the student's week
- Google events are read by the placement itself (`Concentr8GoogleCalendar.busyEvents`), because the app otherwise only
  loads them while the Calendar page is open. When they cannot be read, the to-do waits rather than landing on a real class.
- A to-do is placed once. A moved or deleted block is final; so is finding no room. Nothing is overbooked.
- A block must end before the task's deadline.
- To-dos that existed before, or that arrive by a reset or another tab, are not placed.
- Finishing a to-do removes only a future block this feature made. A block the student planned stays.
- A task that already has a block (every hand-made calendar event creates a task) gets no second one.

## Consequences we accept
- Connecting Google later does not move blocks. A clash shows on the calendar and the student moves it.
- Which to-dos were placed is kept in this browser (`concentr8-task-blocks-v1`), like the rest of the student's data.
- `frontend/index.html` is frozen; this adds one script tag (Camila agreed, 2026-11-05).
