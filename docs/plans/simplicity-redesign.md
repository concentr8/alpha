# Plan: make Concentr8 radically simple (first start and Home)

Status: **WAITING FOR A GO from Jonas.** No app code is changed by this pull request.
Purpose: the design and the build order for the redesign. Phase 2 (implementation) follows this file and nothing else.

Read with it:
- `docs/design/baseline.md`: how many steps the five core tasks take today, and the targets.
- `docs/design/audit.md`: 20 issues with severity, three persona walkthroughs.
- `docs/design/research.md`: sources for every claim, teardown of five reference apps.
- `docs/design/mockups/index.html`: before and after, all component states (open it in a browser).
- `docs/design/mockups/tokens.css`: the tokens as code.

## 1. Questions for Jonas (answers needed before Phase 2)

1. **Colours.** The brief says black/white/grey, but `main` shows Jack's warm paper look (ADR 0037, accepted
   2026-11-04). Research finds no evidence for either with ADHD. The layout works in both; it is one block of
   tokens. **Which one ships: (a) black/white/grey, or (b) Jack's warm colours with two values darkened for contrast?**
   The mockups show both (switch at the top). Recommendation: decide by taste, then test with students.
2. **Calendar step.** The brief calls it mandatory; in the code it is optional since ADR 0039, because Google shows
   "Google hasn't verified this app" for the calendar permission. This plan puts the calendar on its own screen right
   after sign-in with a quiet "Not now". **Keep "Not now" (recommended until Google has verified the app), or remove
   it and make the calendar required?** With the warning, a required step will lose skeptical testers (audit, persona 3).
3. **Swipe cards.** I recommend rows with a visible checkbox instead of swipeable cards: on desktop a swipe cannot be
   discovered, and WCAG 2.5.7 requires a click alternative anyway. Swipe stays as an extra on touch screens.
   **OK to replace the swipeable cards with rows?**
4. **Jack and the frozen frontend.** AGENTS.md says Jack's version wins and new screens carry an "AI generated" note.
   This redesign changes `frontend/index.html` (Home, sign-in, tokens). **Does your go replace Jack's review for this
   work, and may the new screens ship without a visible "AI generated" note** (the marker stays as a code comment)?
5. **Browser tests.** Phase 3 needs end-to-end tests in a real browser. That means Playwright as a development-only
   dependency in a new `e2e/` folder (AGENTS.md: no new dependency without asking). **OK?**

## 2. What changes for the student

| Task | Today | After | 
|---|---|---|
| a. New user: signed in, calendar connected, first to-do | 17 steps, 10 clicks, 8 screens | 6 steps, 1 click, 3 screens |
| b. Start a focus session from Home | 3 clicks | 1 click |
| c. Add a to-do from Home | 2 clicks, page change | 1 click or the `N` key, no page change |
| d. Know what to do next | nothing on Home says it | the Next card says it |
| e. Come back after a day | lands in yesterday's chat | Home with the Next card; last chat one click away |

## 3. The design

### 3.1 First start (three screens, each with one job)
1. **Signing in.** The automatic trip to Google stays (ADR 0040). The blank page is replaced by the brand and one
   status line: "Opening Google sign-in…". If Google cannot open or the student comes back without signing in: the
   same screen with "Sign in with Google to start. It takes a few seconds.", an error box when there was an error, and
   the main button "Continue with Google". No "AI generated" note, no app visible behind it.
   Desktop app: status line "Finish signing in in your browser. Concentr8 continues by itself." plus a secondary
   button "Open Google again".
2. **Calendar** ("Step 2 of 3"). Title "Plan around your real day". Text: "Concentr8 reads your Google Calendar to
   find free time for your to-dos. It never changes your calendar." Main button "Connect Google Calendar", quiet
   button "Not now" (see question 2). While waiting: "Finish in the Google window. Concentr8 continues by itself." and
   a disabled button "Waiting for Google…". On success the app selects one calendar by itself (the one whose id is
   the student's email, otherwise the first in the list), saves it through the existing save call, and moves on. No
   "Save selection". On failure: "The calendar did not connect. Nothing was changed. You can try again or do it later
   in Settings." with "Try again" and "Not now". The existing dialog in Profile → Settings stays for changing calendars.
3. **First to-do** ("Step 3 of 3"). Home with only one question, "What is the one thing you need to get done?", and
   one focused field (placeholder "For example: read chapter 4", key hint "Enter", line below "You can add more
   later."). Enter creates the to-do at once in the browser, without waiting for the server. The text is also sent as
   the first chat message, so the chat can ask its one or two questions (ADR 0031) below the Next card.
   Empty Enter shows "Type a to-do first." under the field.

Rules: the steps show once per account in this browser. A student who already has a connected calendar skips step 2;
a student who already has a to-do skips step 3. Nothing is asked twice (WCAG 3.3.7). There is no tour.
New accounts start **empty**: the sample to-dos, courses, calendar blocks and classmates appear only in demo mode
(`?demo`). Existing accounts keep all their data; nothing is deleted.

### 3.2 Home
From top to bottom, in one column of at most 640 px:
1. **Greeting** (small, grey) and the **"Chats" button** (the chat switcher, unchanged inside).
2. **Next card**: label "Next", checkbox, the to-do's title, one line of meta in words ("Due today, 17:00",
   "Due tomorrow", "Due Fri", "Overdue since yesterday", "Overdue 2 days", "No date", then "· about 45 min" when an
   estimate exists), and the page's one filled button **"Start focus 25 min"** (the number is "Default focus minutes"
   from Settings). One click starts the session for this to-do and opens the existing Focus page with the timer
   running. No dialog. The existing "Start focus" dialog with "Advanced" opens from the card's "⋯" menu
   ("Start with options…").
   - Which to-do is Next: open to-dos only; overdue first (oldest deadline first), then by earliest deadline, then
     to-dos without a date in the order they were added. A running session's to-do is always shown, with the label
     "Now", "Focus ends at 21:40" and a pill "15:32 left · Open" instead of the start button.
   - No open to-do: the card holds the field from step 3 with the question "What is the next thing you need to get
     done?" and a quiet button "Just start 25 min", which starts a session without creating a to-do.
3. **Two more to-dos** as one-line rows (checkbox, title cut with an ellipsis, due date in words, "⋯" menu with
   Edit, Start focus, Delete). Clicking the title opens the existing task editor.
4. **Add row**: "+ Add a to-do". Click it or press `N` (when no text field has focus), type, Enter. The field stays
   focused for the next one; Escape leaves it. A note confirms: `Added "…". Undo`.
5. **"All to-dos (7)"**: opens the existing To Do List page, which gets the same rows and the same sort order.
6. **Chat composer** at the bottom: "Ask Concentr8, or say what is on your plate", microphone, and one suggestion
   chip **"Plan a session"** (this is today's "Quick Start": same message, same focus chat).

Behaviour:
- Ticking a to-do: the row shows a tick and a strike-through, the note says `Done. Undo`, and it stays until the
  student's next action. Then the next to-do moves up. Delete works the same way (Undo, no confirm dialog).
- Sending a chat message turns Home into the conversation, as today. The Next card shrinks to one line and stays on
  top with a secondary "Start focus" button, so focus is still one click away.
- **Every app start opens Home with the Next card and an empty composer.** Chats are still stored; the last one is
  the first row under "Chats". (This follows ADR 0026 and changes one point of ADR 0036.)
- One name for the action: **"Start focus"**. The words "Quick Start" and "Start focus session" disappear from the UI.
- Starting a session never creates a to-do named "Focus session" any more.
- Narrow screens (down to 320 px): one column, the start button full width under the title, sidebar behind the menu
  button as today. On touch screens, swiping a row to the right also marks it done.

### 3.3 Rules from the brief that I challenge (you decide)

| Rule | Proposal | Reason |
|---|---|---|
| Black/white/grey | Open, see question 1 | No evidence either way (research, part A, 5a). Both pass contrast after the fixes |
| Top 3 to-dos as swipeable cards | Top 3 stays; one Next card plus two rows; swipe only as a touch extra | WCAG 2.5.7; swipe is not discoverable on desktop (5c) |
| Small buttons | Small look, safe targets: 36 px buttons, 28 px icon buttons 8 px apart, and one 44 px main action per screen | WCAG 2.5.8 floor is 24 px; Apple and Google recommend 44 to 48 px for touch (5d) |
| Near-empty Home | Kept, but "empty" means one next action, not zero | An empty page makes the student decide; working-memory and choice-overload findings (part A, 1) |
| Tools suggested inside the chat | Kept for tools. The main action "Start focus" is a permanent button | Chat has an articulation barrier; buttons fix discoverability (5f) |
| No mood row, no Claude logo or colours | Kept | No evidence against; nothing in the design needs them |
| Mandatory calendar | Open, see question 2 | Permission priming works better than a wall (part A, 2); Google's warning |

### 3.4 Tokens
All values are in `docs/design/mockups/tokens.css` with their contrast ratios. Summary:
- **Colour:** 12 semantic names (`--bg`, `--surface`, `--surface-sunken`, `--selected`, `--ink`, `--ink-2`, `--muted`,
  `--line`, `--control`, `--action` with hover and ink, `--focus`, `--danger` with surface). Text is at least 4.5:1,
  control edges and the focus ring at least 3:1. `--line` is decoration only.
- **Type:** the two embedded families stay. Five sizes (12, 14, 16, 20, 28 px) instead of 46 declarations; three
  weights (400, 500, 600).
- **Space:** the existing 4 px scale (`--space-1` to `--space-7`) plus `--space-8` 64 px, used everywhere.
- **Radius:** 8 px controls, 12 px panels, pill.
- **Size:** 44 px main action and inputs, 36 px buttons, 28 px icon buttons.
- **Motion:** 100 ms feedback, 200 ms for a row or panel, 300 ms for a screen; one easing curve. With
  `prefers-reduced-motion` all three become 1 ms and movement is replaced by a fade. No looping animation next to a
  task; the timer pill updates its number without pulsing.
- **Old names** map to new ones so nothing breaks in between: `--paper`→`--bg`, `--sidebar`→`--surface-sunken`,
  `--body-ink`→`--ink-2`, `--hover`→`--surface-sunken`, `--radius-*` unchanged.

### 3.5 Components (all states are drawn in section 6 of the mockups)
| Component | States |
|---|---|
| Button: main, secondary, quiet, icon, chip | default, hover, pressed (scale 0.98), keyboard focus, disabled, busy (spinner only after 1 s) |
| Next card | next, now (session running), overdue, empty (first to-do field), compact (inside a chat) |
| To-do row | default, hover/focus, overdue, done with Undo, long title, add row (idle, typing) |
| Field | default, focus with key hint, error with a sentence under it |
| Note with Undo | stays until the next action; never a timed toast for something that can be undone |
| Error box | says what happened and what to do; never a raw error such as "Failed to fetch" |
| Status line | spinner plus words; a still icon under reduced motion |
| Onboarding screen | default, waiting, failed |
| Session pill | running, complete (existing behaviour, new tokens) |

### 3.6 Nothing is lost
| Today | After |
|---|---|
| "Quick Start" (AI plans a session) | chip "Plan a session", same behaviour |
| "Start focus session" in focus chats | same button, named "Start focus" |
| Start focus dialog with "Advanced" | Next card "⋯" → "Start with options…"; Toolbox and Courses unchanged |
| Chat, chat history, search, drafts, voice input | unchanged; reached from the composer and "Chats" |
| Restoring the last chat on start | first row under "Chats" (one click) |
| To Do List page, "New task" dialog | unchanged, plus sorting and the new rows |
| Google Calendar dialog in Settings | unchanged, plus plain error texts |
| Sample data | demo mode only |
| Sidebar, Courses, Toolbox, Data, Calendar, Profile, Focus, Break, Workflow, Room | no flow change, new tokens only |

## 4. Build order for Phase 2 (small pull requests)

Rules for every pull request: read only the files it names; `npm test` green in `server/` and `app/`; the flow
checked in a real browser at 1280 and 390 px wide; before/after screenshots in `docs/evidence/simplicity/`; keyboard
only, contrast and reduced motion checked; every new or changed text goes through `t()` with German ("du"), French
("tu") and Spanish (Spain) entries; `docs/architecture.md` and `docs/design.md` updated; one ADR where noted; title in
plain words for the student. If something here is unclear or wrong, write the question into the pull request
and stop. Hard limits: no change to secrets, env vars, OAuth settings or the workflows in `.github/`.

### PR 1: "Calmer look: one set of colours, sizes and spacing"
- Scope: `frontend/index.html` theme block (`:root`, lines 881-918 and the theme rules after it). Add the tokens of
  `tokens.css` (theme per question 1), keep the old names as aliases. No layout change.
- Accept when: (1) every colour pair used for text measures at least 4.5:1 and every control edge and focus ring at
  least 3:1 (list the measured pairs in the pull request); (2) the focus ring is 2 px `--focus` with a 2 px gap
  everywhere; (3) under `prefers-reduced-motion: reduce` no CSS transition or animation runs longer than 1 ms,
  including the chat switcher chevron (`index.html:767`); (4) screenshots of Home, To Do List, Toolbox, Calendar,
  Profile, Focus show no layout shift against `main` beyond colour; (5) ADR "Design tokens of the simplicity redesign".

### PR 2: "Texts can be translated, and the new building blocks exist"
- Scope: new `frontend/i18n.js` (way B of `docs/plans/languages.md`: English text is the key, `t(text, values)`
  with `{n}` patterns), `frontend/i18n/de.js`, `fr.js`, `es.js`, tests in `frontend/test/i18n.test.js` (add them to
  the test list in `server/package.json`, together with `frontend/test/demo.test.js`, which CI skips today).
  CSS classes for the components of section 3.5 in `index.html`, not used by any page yet.
- The language stays English for everyone until CON-43 adds the switch; `?lang=de|fr|es` forces a language for testing.
  This avoids a half-translated app.
- Accept when: (1) `t()` returns the translation, falls back to English, fills `{n}`, and never touches text
  typed by the student (test for each); (2) a test fails when a string used through `t()` has no entry in one of the
  three dictionaries; (3) no test page is added: the component CSS is copied from the mockup file rule for rule; (4) no visible change in the app.

### PR 3: "A new student is set up in three calm steps"
- Scope: `frontend/concentr8-signin.js` (status screen, fallback screen, no "AI generated" text), new
  `frontend/onboarding.js` (which step shows; pure functions with tests in `frontend/test/onboarding.test.js`),
  `frontend/concentr8-google-calendar.js` (expose connect and "select one calendar and save" for step 2; plain
  error texts), `frontend/index.html` (`initial()` at 1307-1325: samples only in demo mode; step screens).
- Accept when: (1) a new account on the web goes: status line → Google → calendar screen → first to-do field, with
  1 click inside Concentr8 before typing; (2) the page is never blank for more than 1 s without the status line;
  (3) after connecting, one calendar is selected and saved without a further click, and Calendar shows its events;
  (4) "Not now" (if kept) goes to step 3 and the step never shows again, Settings still offers the calendar;
  (5) a failed or cancelled connection shows the failure screen, never "Failed to fetch"; (6) Enter in step 3 shows
  the to-do on Home within 100 ms with the server blocked; (7) a new account has 0 to-dos, 0 courses, 0 events;
  `?demo` still has the samples and still skips sign-in; an existing account keeps every to-do it had; (8) the three
  dead "Continue with Google" buttons (`index.html:1926`, `1928`, `1931`) start sign-in; (9) every screen works with
  Tab, Enter and Escape only, and the field in step 3 has focus on arrival; (10) desktop app: the status text of
  section 3.1 shows and sign-in completes; (11) ADR "Calendar step right after sign-in" (changes ADR 0039 as
  answered in question 2).

### PR 4: "Home shows your next to-do and starts focus in one click"
- Scope: `frontend/index.html` Home markup and script (577-593, 2804-2866, 782-788), new `frontend/home-next.js`
  (sorting and due-date words, pure, with tests in `frontend/test/home-next.test.js`), `ensureTask` at 1527-1531.
- Accept when: (1) from Home with one open to-do, one click on "Start focus" shows the Focus page with the timer
  running for that to-do and the minutes from Settings; (2) the order of section 3.2 holds (tests: overdue, today,
  tomorrow, weekday, no date, same deadline); (3) due dates use the device time zone and the words of section 3.2;
  (4) `N` focuses the add field unless a text field has focus; Enter adds and keeps focus; Escape leaves; (5) tick,
  delete and add each show a note with a working Undo that stays until the next action; (6) with no open to-do the
  card shows the field and "Just start 25 min", and that session creates no to-do; (7) no path creates a to-do named
  "Focus session"; (8) reloading the app always shows Home with the Next card; the previous chat is the first row
  under "Chats" with its messages and draft intact; (9) inside a chat the compact card stays visible while the
  conversation scrolls, and "Start focus" there needs one click; (10) "Plan a session" behaves exactly like "Quick
  Start" did; the strings "Quick Start" and "Start focus session" are gone from the UI; (11) at 320 px wide nothing
  scrolls sideways and no text is cut in any of the four languages (`?lang=`); (12) only one filled button is on
  Home; no target is smaller than 24x24 px; (13) ticking a to-do never moves the pointer target under the cursor to
  a different to-do before the student's next action; (14) ADR "Home leads with the next to-do" (changes ADR 0036
  for the landing view and "Quick Start").

### PR 5: "The rest of the app uses the same calm look"
- Scope: remaining pages in `frontend/index.html` (To Do List, Toolbox, Courses, Data, Calendar, Profile, Focus,
  Break, tool pages, dialogs, agent panel). Replace literal font sizes, radii and spacing with tokens; apply the row
  and sort order to the To Do List; no flow change.
- Accept when: (1) font sizes in the CSS are only the five token sizes, except timer numerals and the calendar
  grid (list every exception); (2) every page was compared before/after and each visible difference is listed;
  (3) all features of section 3.6 were clicked through once (checklist in the pull request); (4) the privacy text no
  longer mentions free guest messages (`index.html:1930`); (5) `docs/design.md` describes the new tokens and
  components and no old value.

Not in this plan (own Linear issues): calendar blocks for to-dos without Google (A14), the Focus page scroll
position on phones and the floating "AI" button (A18), removing the unreachable guest chat code (A19), the full
translation of the existing 542 texts and the language switch (CON-43).

## 5. How Phase 3 checks it
Re-run the five tasks of `baseline.md` the same way and compare; repeat the audit and the three walkthroughs; add
end-to-end tests for first start and Home (question 5); then a 15-minute moderated test with five Berkeley students.
Three points have no evidence yet and are the first things to watch there: the colour choice, the top-3 cap, and
whether students notice the Next card before the chat box.
