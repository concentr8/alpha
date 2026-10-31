# 0027 Chat actions, tools inside the chat, no stored chat

Status: accepted (Jonas, 2026-10-30). Plan: docs/plans/home-chat-tools.md. Extends ADR 0026.

## Context
The fixed row "+ To-do / + Calendar / Tools" under every message was noise, and the tools lived on a separate page.

## Decision
- `/api/chat` and `/api/chat/guest` answer `{ reply, actions }` (Claude tool use). The server checks every action
  (`cleanActions`); the app, not the model, changes data (`Articul8.runAction`).
- `add_todo` runs at once, always with an "Undo" line. `suggest_todo` and `suggest_calendar` are small buttons; the newest
  one is confirmed with Enter when the composer is empty. Sending a new message dismisses open offers.
- `open_tool` shows a card with "Open" for one of the seven tools. Toolbox and Workflow leave the sidebar; the page code
  stays, because the cards open its detail pages. TODO: the "Back" button of a tool page still goes to the Toolbox page.
- Chat messages are no longer stored or restored: every start is a clean page. Tasks and events stay stored.
- The user's message is a dark bubble, Concentr8 answers as plain text (neutral black, white, grey only).
- The Home page carries a very quiet `.preview-note.quiet` line, so Jack knows it is AI generated.
- `due` for `add_todo` is not built yet. TODO: add it once tasks have a stable due field in the chat flow.

## Consequences
- More tokens per answer (tools in the request); measure before going live.
- The old local calendar guess for every message is gone; it only runs while an event is the chat context.
