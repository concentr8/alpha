# 0022. The frontend talks to the Concentr8 server (supersedes parts of ADR 0001)

Status: Accepted (Jonas, 2026-10-28)
Date: 2026-10-28
Deciders: Jonas (Jack to review)

## Context
ADR 0001 froze `frontend/index.html`. Jonas wants a stable version where the phone call and the AI chat work,
which needs the app to call the server (docs/plans/call-and-chat.md).

## Decision
New logic lives in its own file, `frontend/concentr8-server.js`. `frontend/index.html` changes only here:
1. one `<script src="concentr8-server.js">` tag;
2. Profile menu entry "Phone call" and the line that draws that page;
3. messages get `role` (`user` or `assistant`); answers are drawn left-aligned (one inline style, marked AI-GENERATED);
4. the "last message" used as task context ignores assistant answers;
5. after `store.send(...)` in the Home/agent composer and the voice input, `window.Concentr8?.ask()` is called;
6. the privacy text says what is sent to the server and to Claude.
The Phone call page is built from existing classes and marked "AI generated" (Jack has no wireframe for it).

## Consequences
- Good: the look is unchanged; Jack can redraw the Phone call page without touching the logic.
- Harder: the app now needs the internet for chat and calls; the server address is a constant in one file.
- The frontend is no longer "frozen"; any further change still needs the plan-first rule in AGENTS.md.
