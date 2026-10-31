# Plan: follow-ups of the chat actions (ADR 0027)

Status: PROPOSED. Needs a human "go" (AGENTS.md) before code is written.
Source: open TODOs of ADR 0027 and `docs/plans/home-chat-tools.md`, 2026-10-30.
UNVERIFIED means not checked yet.

## 1. Due date for `add_todo` and `suggest_todo`
**Today:** the model only sends a title. "Up next" sorts by a due date, which comes from the task's linked deadline
event (`deadlineOf(task)` in `frontend/index.html`). A task from the chat has none, so it lands at the end of the row.
**Plan:**
- Add an optional `due` (`YYYY-MM-DD`) to the tools `add_todo` and `suggest_todo` in `server/index.js`.
  `cleanActions` drops a `due` that is not a real date and keeps the action.
- When the app runs the action, it also saves an all-day deadline event for that task (same call as the calendar
  button, `kind: 'deadline'`). So "Up next", Calendar and the due label work without a new data field.
- The line reads "Added to to-do: Email Prof. Smith · Mon · Undo". Undo removes the task and its deadline.
- Tests: valid and invalid `due` in `server/test/chat-actions.test.js`; a browser check that the new task appears
  in "Up next" in the right place.
**Open question for Jonas:** should the model guess "Monday" from "by Monday" (it knows today's date), or only use
dates that are written out? Recommended: guess, because the line shows the date and Undo is always there.

## 2. "Back" on tool pages opened from the chat
**Today:** the tool card opens `#toolbox/<tool>`, and "Back" goes to the Toolbox page, which is no longer in the
sidebar (`data-product-back="Toolbox"`, `subheading()` in `frontend/index.html`).
**Plan:** remember where the tool was opened from (the same idea as `returnPage` in the body doubling code). From a
chat card "Back" goes to Home. From Courses and Calendar it keeps going to where it came from. The Toolbox page
stays in the code, only without a way in from the sidebar.
**Open question for Jonas:** after "Back" the chat is still there (same page session) but is lost on reload,
because chat is no longer stored (ADR 0027). Is that fine? Recommended: yes, it matches "clean start".

## 3. French "tu"
`docs/plans/languages.md` decision 1 says French uses "tu" (TODO: confirm). Jonas, please confirm or change.
The table `docs/plans/home-chat-tools-translations.md` already uses "tu".

## 4. Translation layer
No new plan: it is steps 0 to 4 of `docs/plans/languages.md` (`frontend/i18n.js`, dictionaries de/fr/es, a test that
fails for a missing translation). The only addition: the table `home-chat-tools-translations.md` is the input for the
dictionaries, and the string list of step 0 must include the strings of ADR 0026 and 0027 (greeting, "Up next",
chat buttons and lines, tool names). The strings that the server puts together stay out of the dictionaries: the
model answers in the language of the student already.

## Steps (after the go, one pull request each)
1. Due date (server + app), tests, screenshot of "Up next" with a due date from the chat.
2. "Back" from the chat cards.
3. i18n: continue with `docs/plans/languages.md`, after the French answer.

## Risks
- A wrong date guessed by the model: always visible in the line, Undo removes it.
- A deadline event for every chat task fills the calendar: only when the model sends a `due`; plain tasks add none.
