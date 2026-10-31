# Find time for a task

Purpose: approved implementation plan for package 2; read before code.
Calls no services and adds no dependency.

Add an AI-generated block inside the Calendar rail (not another page):
choose an unfinished task, enter its estimated minutes, and ask for the first
free slot. Store estimates separately in browser-local calendar preferences
because the task schema is outside the calendar-only editing exception.

Use a pure function with explicit events, local wall-clock now, and estimated
minutes as inputs. Search today and the following six calendar days, 08:00 to
21:00, at 15-minute starts, never in the past. Existing events, even hidden
calendars, block the slot; all-day ranges block every included date. Timed
deadlines occupy the same 30 minutes as the grid. No slot is an explicit state.
Do not suggest a slot while connected Google data is loading, failed or stale.

“Add to calendar” opens the existing event editor with task and slot filled;
only its Save commits the event. Write tests for overlaps, touching edges,
working-hour boundaries, multi-day/all-day events and no availability.

Capture 1440px and 390px before/after evidence, update architecture and ADR.
This PR is stacked on the redesign, with no merges or force-pushes.
