# Plan: every to-do gets a time estimate first (Linear CON-35)

Status: go given by Jonas 2026-11-03. Time is shown in the to-do list and in the calendar (Jonas: "both").

## What exists
- The server (`server/index.js`, chat prompt and `add_todo`) already says "first, let's figure out how long each one takes", suggests obvious times and only adds a to-do once it knows the minutes. Its answer carries `minutes`.
- The calendar's "Find study time" already prefills `task.estimatedMinutes`, but nothing ever set it.

## Change (small, `frontend/index.html`, AI generated parts keep their markers)
- Accepting a chat to-do saves `minutes` as `task.estimatedMinutes`.
- The chat button and note show the time: "+ To-do: Email professor (5 min)".
- The to-do list on Home shows "· 5 min" after the title.
- The calendar's "Find study time" task list shows the time and prefills it (already worked for the field).

## Not in this change
- Tasks typed by hand (Toolbox composer) still have no estimate; asking for one there needs a wireframe from Jack.
- Showing the estimate inside calendar events.
