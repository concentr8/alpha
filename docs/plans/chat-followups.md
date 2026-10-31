# Plan: follow-ups of the chat actions (ADR 0027)

Status: PROPOSED. Jonas answered the questions on 2026-10-30 (below). Needs a human "go" (AGENTS.md) before code is written.
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
**Decision (Jonas, 2026-10-30):** the model always suggests a sensible due date for a new to-do (it guesses from
"by Monday" and also proposes one when the student names none). The line shows the date, Undo removes it.

### 1b. Learning the student's due dates (new, Jonas asked for a "learn function")
Goal: the suggestion gets better the longer a student uses the app. Proposal, kept small and readable:
- The app keeps a short history per student (browser, with the task data): for each to-do the suggested date, the date
  the student ended up with (accepted, changed, undone) and the course or tool it belongs to. Last 50 entries.
- From that history the app computes simple habits: the usual gap between "added" and "due" per course, and whether
  the student usually moves suggestions earlier or later (e.g. "moves dates 1 day earlier").
- These habits go to the model as 2-3 plain lines in the chat request ("Usually due 3 days after adding for COMPSCI 188;
  often moves suggestions 1 day earlier"). No separate model, no training: Claude uses the lines when it picks the date.
- The student can see and clear the habits under Profile, Settings (AI generated, built from existing classes).
- Tests: the habit calculation (pure function, fixed history in, fixed lines out); a browser check that a changed date
  shows up in the next request.
**Open question for Jonas:** is "learn" meant like this (habits from accepted and changed due dates)? Or also what the
student likes to do at which time of day? Recommended: due dates only first, the rest later.

## 2. "Back" on tool pages opened from the chat
**Today:** the tool card opens `#toolbox/<tool>`, and "Back" goes to the Toolbox page, which is no longer in the
sidebar (`data-product-back="Toolbox"`, `subheading()` in `frontend/index.html`).
**Plan:** remember where the tool was opened from (the same idea as `returnPage` in the body doubling code). From a
chat card "Back" goes to Home. From Courses and Calendar it keeps going to where it came from. The Toolbox page
stays in the code, only without a way in from the sidebar.
**Decision (Jonas, 2026-10-30):** a reloaded chat may be empty only for students WITHOUT an account. For students with
an account the conversation is kept and restored. This changes ADR 0027 ("no stored chat"): a new ADR supersedes it
for signed-in students (AGENTS.md: no silent reversal).
**Plan for the stored chat:** signed in (token present) the last 50 messages are saved with the other task data in the
browser and restored on start; guests stay clean. The "Reset all data" button also deletes it. TODO: decide with Jonas
whether the chat should also follow the student to another device (then it lives on the server and the privacy text must
say so); the first version stays in the browser.

## 3. French "tu"
**Confirmed by Jonas, 2026-10-30:** French uses "tu". Done in `docs/plans/languages.md` decision 1.

## 4. Translation layer
No new plan: it is steps 0 to 4 of `docs/plans/languages.md` (`frontend/i18n.js`, dictionaries de/fr/es, a test that
fails for a missing translation). The only addition: the table `home-chat-tools-translations.md` is the input for the
dictionaries, and the string list of step 0 must include the strings of ADR 0026 and 0027 (greeting, "Up next",
chat buttons and lines, tool names). The strings that the server puts together stay out of the dictionaries: the
model answers in the language of the student already.

## Steps (after the go, one pull request each)
1. Due date (server + app), tests, screenshot of "Up next" with a due date from the chat.
1b. Learned due dates (history, habits, lines to the model, Settings view), tests.
2. "Back" from the chat cards, and the stored chat for signed-in students (new ADR superseding part of 0027).
3. i18n: continue with `docs/plans/languages.md`, after the French answer.

## Risks
- Learned habits can be wrong or feel creepy: the student sees them, can clear them, and they never leave the browser except as the 2-3 lines in the chat request.
- A wrong date guessed by the model: always visible in the line, Undo removes it.
- A deadline event for every chat task fills the calendar: only when the model sends a `due`; plain tasks add none.
