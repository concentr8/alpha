# Plan: Clean Home start screen and tools inside the chat

Status: ACCEPTED. Jonas answered the decisions on 2026-10-30 (below). Built step by step.
Source: Jonas, 2026-10-30, with a mockup of two screens (clean start, chat with tools).
UNVERIFIED means not checked yet.

## Goal
1. Every time the app opens, Home is a clean page: greeting, the three most urgent to-dos, the chat box.
2. Tools are no longer a separate page. Concentr8 offers them inside the chat, when they help.
3. Concentr8 reads the chat and adds a to-do by itself when it is sure, or offers a button when it is not.
4. User and Concentr8 messages look different (user: dark bubble, Concentr8: plain text).

## What exists today (read from the code, 2026-10-30)
- `frontend/index.html` `.check-in`: title "How are you feeling?", eight mood checkboxes, `.conversation`, `.chat-composer`.
  The right column `.todo` shows the full to-do list.
- Every user message has a fixed row "+ To-do", "+ Calendar", "Tools" (render code near `data-message-task`).
  "Tools" opens the Toolbox page (`P.go('Toolbox')`).
- `POST /api/chat` (`claudeChat()` in `server/index.js`) returns only `{ reply }`. The model sees the open task titles.
- The Toolbox page has Timer, Body Doubling, Music, Block App, Breathing Exercise, Meditation, Checklist.
- No wireframe from Jack exists for this, so everything is built from existing classes and marked
  "AI generated" (`.preview-note` plus an `AI-GENERATED:` comment).

## Design
### Start screen
- Hide the mood row and the right to-do column on Home. Open to-dos are shown as "Up next": the top 3 by due date,
  one horizontal row, swipeable (`overflow-x: auto`, scroll snap). Each card has two lines: title (one line,
  ellipsis) and due date. A tap opens the task.
- The greeting changes with the time of day ("Good morning/afternoon/evening, <name>"). Name comes from Profile.
- The composer keeps its current behaviour. A "+" button opens the tools list as a menu; typing "/" does the same.

### Chat messages
- User message: dark bubble (`--ink`, white text). Concentr8: plain text, no bubble. Uses existing tokens only.
- The fixed row "+ To-do / + Calendar / Tools" is removed.

### Actions from the model
`/api/chat` answers `{ reply, actions }`. `actions` is a list, usually empty, at most 2 entries:

| action | meaning | what the app shows |
|---|---|---|
| `add_todo { title, due? }` | the student clearly stated a task | task is added; line "Added to to-do: <title> · Undo" |
| `suggest_todo { title }` | maybe a task | small button "+ To-do: <title>" |
| `suggest_calendar { title, start, end }` | a task with a time slot | small button "+ Calendar: <time>" |
| `tool { id }` | a tool would help right now | inline card with a Start button (timer, breathing, music ...) |

- The model returns the actions with Claude tool use (one tool per action type). UNVERIFIED: check the API docs for the
  exact request fields before coding.
- The server never trusts the model: `id` must be in a fixed list of tool ids, titles are cut to 120 characters and
  single-line, dates must parse, more than 2 actions are dropped. An invalid action is dropped, the reply stays.
- The app decides what happens, not the model: `add_todo` calls the same `store.addTask` as the old button.
  "Undo" removes that task again.
- If the call fails or returns no actions, the chat works as today (text only).

### Toolbox page
- Tools are opened from chat cards, the "+" menu and the Courses/Calendar pages. The Toolbox and Workflow entries leave
  the sidebar. The page code stays for now (the cards open the same detail pages), so no feature is lost.

## Needs a human "go" (AGENTS.md)
- A small button size is new: existing `.wire-button` is 48px high. Plan: one small variant, copied from `.message-action`
  and added to `docs/design.md`. Jonas wants smaller buttons in the chat.
- Changing `frontend/index.html` (ADR 0001, 0007). A new ADR supersedes 0001 for the Home page only.

## Decisions (Jonas, 2026-10-30)
1. The mood row is removed completely (not moved). TODO: check what uses `mood` today (tool recommendations) and remove that too.
2. The right to-do column leaves Home. The last "Up next" card is "All to-dos".
3. All seven tools may appear as chat cards. The model chooses.
4. Concentr8 adds a task by itself only when the student clearly states one, always with "Undo". An offered action
   ("+ To-do: <title>") is confirmed with one click or with Enter: the newest offer is focused, Enter confirms it,
   typing a new message dismisses it.

## Risks
- The model adds wrong tasks: Undo on every automatic add, strict rule in the system prompt (only explicit tasks).
- Each answer gets slightly longer (more tokens): measure cost per message before and after.
- Tasks titles are private data: not logged (AGENTS.md).

## Steps (after the go, one pull request each)
1. Start screen only (frontend, no server). Before/after screenshots, nothing else changes.
2. `actions` in `/api/chat` and `/api/chat/guest` with tests in `server/test/`. `.env.example` unchanged.
3. Render actions in the chat, remove the fixed message row, new bubble look.
4. Take Toolbox and Workflow out of the sidebar. ADR, `docs/architecture.md` and `docs/design.md` updated in each PR.
