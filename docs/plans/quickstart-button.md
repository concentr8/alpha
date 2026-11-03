# Plan: Quick start button on Home (Linear CON-38)

Status: go given by Jonas 2026-11-03.

A student who does not want to plan should be able to start in one click. Home gets one button, "Quick start · 10 min". It opens the normal "Start focus" dialog with a checklist and a 10 minute timer already chosen, for the task in focus (or a new task typed in the dialog). Same session as the Quick Start workflow template; no new session type.

- `frontend/index.html`: one button under "Up next" (AI generated, `.wire-button solid`) and one click handler that calls `FocusUI.setup({ selected: ['checklist', 'timer'], minutes: 10, origin: 'Home' })`.
- If a session is already running, the button opens it instead of starting a second one (existing behaviour of `setup`).
- Open for Jack: where the button sits and how it looks.
