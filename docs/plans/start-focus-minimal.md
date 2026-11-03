# Plan: a minimal "Start focus" dialog

Status: go given by Jonas 2026-11-03 ("too big, minimal, always start from a new task, rest under Advanced").

- The dialog shows one field, "What will you work on?", and Start. A new task is always the starting point; an existing task is used only when the caller names it (then its title is shown instead of the field).
- Task picker, workflow, minutes and timer mode move under an "Advanced" toggle (a `<details>`). It opens by itself when a workflow or stopwatch was asked for.
- The dialog no longer preselects the task that was last in focus.
- Open for Jack: how it should look.
