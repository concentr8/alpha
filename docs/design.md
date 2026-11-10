# Design of the frontend (as built by Jack)

The look is defined by `frontend/index.html`. This file describes it so a new
person or AI reuses it. Facts below were read from the CSS in that file.

## The rule
Do not invent new buttons, colors, fonts or layouts. Reuse the classes below.
If something is missing, copy the closest existing class, say so in the pull
request, and add it here. Any visual change needs a human "go" (ADR 0001).

## Look in one sentence
A warm paper look (Jack, 2026-11-04): cream page, sand sidebar, dark brown text,
one terracotta button colour, Bricolage Grotesque for titles and Lexend for text
(both embedded in the file, SIL Open Font License, licence texts in the
`bundled-licenses` block). Thin warm borders, almost no shadows.

## Tokens (CSS variables in `:root`, written once in the file)
Names and values follow ADR 0046 (`docs/design/mockups/tokens.css`, warm theme). The old names (`--paper`, `--sidebar`,
`--body-ink`, `--ink-hover`) were retired in the simplicity redesign, PR 5.
| Use | Variable | Value |
|---|---|---|
| Page background | `--bg` | `#fffbf2` |
| Cards, dialogs | `--surface` / `--surface-muted` | `#fffdf8` / `#f1e3d7` |
| Sidebar, sunken areas | `--surface-sunken` | `#efddc8` |
| Text / secondary text | `--ink` / `--ink-2` | `#2a1d14` / `#4a3020` |
| Muted text | `--muted` | `#655445` (at least 4.5:1 on every surface) |
| Dividers / control borders | `--line` / `--control` | `#e2d6c9` (decoration only) / `#8f7a69` (at least 3:1) |
| Selected / hover | `--selected` / `--hover` | `#f2cab6` / `#f7e4d6` |
| Main button (and progress) | `--action` (`--action-hover`, `--action-border`, `--action-ink`) | `#b4532f` (`#9f4728`, `#924124`, `#fffbf2`) |
| Progress, soft | `--progress`, `--progress-soft` | `#b4532f`, `#c88d6d` |
| Error | `--danger`, `--danger-surface` | `#9b2948`, `#f8e7ec` |
| Focus ring | `--focus` | `#2a1d14`, 2px, offset 2px (exceptions: calendar events 1px, scroll areas inset, meditation slider 7px) |
| Shadows, backdrop | `--shadow-color`, `--shadow-faint`, `--backdrop` | brown at 10%, 4%, 20% |
| Fonts | `--font-display` / `--font-body` | Bricolage Grotesque / Lexend |
| Text sizes | `--text-xs` … `--text-xl` | 12 / 14 / 16 / 20 / 28px; weights `--weight-regular/medium/bold` 400/500/600. Exceptions: the calendar grid and its dialogs, timer and stat numerals over 34px |
| Space | `--space-1` … `--space-8` | 4 / 8 / 12 / 16 / 24 / 32 / 40 / 64px |
| Corners | `--radius-control` / `--radius-panel` / `--radius-pill` | 8px / 12px / 999px |
| Sizes | `--size-main` / `--size-control` / `--size-small` | 44px main action and inputs / 36px buttons / 28px icon buttons (8px apart) |
| Motion | `--dur-fast` / `--dur-base` / `--dur-slow`, `--ease` | 100 / 200 / 300ms; all 1ms under `prefers-reduced-motion` |
Use the variables, not new hex values. Pixel sizes of titles and rows below were
measured before the warm look and may be a little off; the CSS is the truth.

## Layout
- `.app` is a 3-column grid: sidebar 224px, content (flexible), agent panel 336px.
  Phone widths down to 320px use one column (ADR 0014, 0049).
- Pages (Jack, 2026-11-03, ADR 0036): Home, Courses, Toolbox, To Do List, Data,
  Calendar in the sidebar (buttons with `data-page`), plus Workflow, Profile, Focus,
  Room and Break. A hash router shows them (`#calendar`, `#todos`, `#data`,
  `#toolbox/music` etc.).
- Home (Jack): a chat switcher top left (`.chat-switcher`, history panel
  `.chat-history`), the small greeting, the Next card with two rows and the add row (`#home-next`, ADR 0049), the chip
  "Plan a session" (`#quick-start.c8-chip`) and, in a focus chat, `.focus-chat-actions` ("Start focus"). The AI button
  is hidden on Home.
- Toolbox detail pages: Timer, Body Doubling, Music, Block App, Breathing
  Exercise, Meditation (and Saved sessions), Checklist.
- Content pages use `.page-content` and start with `.product-heading` (title,
  optional `.text-back`, buttons on the right).
- Responsive steps: 1250, 1200, 1100, 960, 900, 850, 780, 700 px. Detail pages
  (Room, Block App, Meditation, Timer) fill the window height (`100dvh`).

## Components (class names to reuse)
| Class | Use | Key facts |
|---|---|---|
| `.wire-button` | Every normal button | min-height 44px, 1px `--control` border, `--radius-control`, `--text-sm`, hover `--hover` |
| `.wire-button.solid` | The one main action | `--action` background, `--action-ink` text, `--action-border` |
| `.icon-button` | Icon only (close, menu) | 44x44px, transparent, `--radius-control`, hover `--hover`; needs `aria-label` |
| `.text-back` | "Back" link at the top | no border, `--text-sm`, `--ink-2` |
| `.chat-action` (`.solid`, `.quiet`) | Small button under an answer of Concentr8 (ADR 0027) | 30px high, 14px text, 1px `--ink` border, radius 8px; Enter confirms the newest one (`kbd` hint) |
| `.chat-note` / `.chat-undo` | Plain line "Added to to-do: … · Undo", no box | `--text-sm`, `--muted` |
| `.chat-tool` | Tool card inside the chat (name + Open) | 1px `--line`, `--radius-panel`, max 380px |
| `.preview-note.quiet` | "AI generated" marker where one is still shown (calendar dialogs) | `--text-xs`, `--muted`, no box |
| user message | Dark bubble: `--ink` background, `--surface` text, rounded (answers have no bubble) | |
| `.message-action` | Small text action in chat | underline on hover |
| `.product-form` | Forms in dialogs | grid, inputs 44px high, 1px `--control` border on `--surface`, `--radius-control` |
| `.cal-field` | Labelled field in calendar forms | same input look as `.product-form` |
| `.dialog-actions` | Button row at the bottom of a dialog | right-aligned, gap 12px |
| `.section-toolbar` | Heading with actions on one line | space-between |
| `.preview-note` | Grey hint text ("preview only") | `--text-md`, `--muted` |
| `.empty-message` | Empty list text | `--text-md`, `--muted` |
| `.stat-row` | Three numbers in a row | big 38px numbers |
| `.template-grid` | Cards in 3 columns (2 when narrow) | gap 22px |
| `.avatar` | Round initials | 40px, `--surface-muted` |
| `.chat-switcher` / `.chat-history-row` | Chat title button and its history list on Home (Jack) | 44px high, 1px `--line`, `--surface`; rows 44px, current row `--selected` |
| `.quick-start-options` / `.focus-chat-actions` | Row for the "Plan a session" chip / the "Start focus" button of a focus chat | chip 28px (`.c8-chip`); button 44px |
| `.chat-pending` | "Concentr8 is thinking…" under the chat (Jack) | `--text-sm`, `--muted` |
| `.cal-toolbar` / `.cal-toolbar-actions` | Calendar's one toolbar row (Jack) | 40px controls, range 20px |
| `.profile-picture`, `.avatar img` | Profile picture (AI generated, not drawn by Jack) | 72px on Personal information, 32px in the sidebar |
| `.detail-heading` | Header of a tool page: `.text-back`, `h1`, `.detail-actions` on the right | `--text-xl` title, actions push right |
| `.detail-section`, `.detail-note`, `.detail-empty` | Block with a `--text-lg` title, grey note, empty text | notes `--muted`, `--text-md` |
| `.detail-search` | Search field with icon and button | 1px `--control`, `--radius-control`, focus ring around the whole field |
| `.ambient-card` | Music card with picture and name | `--surface`, 1px `--line`, `--radius-panel`, selected = 2px dark frame around the whole card |
| `.player-bar` / `.meditation-player` | Bottom player (music, meditation) | 1px border, `--radius-control` / `--radius-panel`, round play button |
| `.block-preset`, `.blocked-app` | Block App preset card and chip | `--surface`, 1px `--line`, `--radius-panel` / `--radius-control` |
| `.check-row` | Checklist row | checkbox, text field, due date, delete |
| `.time-wheels` | Timer picker (hours, minutes, seconds) | scroll-snap wheels, selected row `--selected`, tabular numbers |
| `.solo-timer-dial` | Clockwise timer ring | stroke 7, `--progress` on a `--surface-muted` track |
| `.data-chart`, `.activity-bar` | Insights bar chart | bars `--progress-soft` |
| `.room-grid`, `.camera-frame`, `.room-toolbar` | Body Double room | 3x2 grid, toolbar with 5 buttons |
| `.composer` | Text input with send button | 1px `--control`, `--radius-panel`, `--surface`; focus ring around the whole box |
| Calendar mini month, visibility rail, quick add, view switch | Calendar-only extension built from `.wire-button`, `.icon-button`, `.cal-field`, `.preview-note.quiet` | Day / Week / Month; task blocks use existing light greys, deadlines use `--ink`, read-only Google blocks use existing sage/grey with dashed borders |
Dialogs, calendar details and the agent panel are built in the scripts and
reuse the same classes.

## Building blocks of the simplicity redesign (`c8-` classes, ADR 0046)
Written once in the `simplicity-components.css` style block of `frontend/index.html`; drawn with every state in
`docs/design/mockups/index.html`, section 6. Use these for first start, Home and new work; older classes stay for older pages.
| Class | What | States |
|---|---|---|
| `.c8-btn` + `--main` / `--quiet` / `--icon` | Buttons: 36px; main action 44px (one per screen); icon 28px, 8px apart | hover, pressed (scale .98), focus ring, disabled, busy (`.c8-spinner` after 1s) |
| `.c8-chip` | Chat suggestion | hover, focus |
| `.c8-check` | Native checkbox, 24px | unchecked, hover, checked, focus |
| `.c8-next` (`__label`, `__title`, `--compact`) | Next card on Home | next, now, overdue, empty, compact; one column under 560px |
| `.c8-rows`, `.c8-row` (`__title`, `--done`, `--add`) | One-line to-do rows and the add row | hover/focus, done, long title (ellipsis), add row focus |
| `.c8-field`, `--error`, `.c8-field-error` | Text field with a key hint (`.c8-kbd`) | focus, error with a sentence under it |
| `.c8-note` | Message with Undo; stays until the next action | — |
| `.c8-alert` | Error: what happened (`strong`), what to do | — |
| `.c8-status` | Spinner plus words | still under reduced motion |
| `.c8-pill`, `.c8-ring` | Running session; ring fill from `--c8-done` (0-100) | — |
| `.c8-onboarding`, `.c8-brand`, `.c8-step`, `.c8-title`, `.c8-body`, `.c8-stack` | First-start screens | — |
| `.c8-meta`, `.c8-overdue`, `.c8-label` | Small grey text, overdue text (words plus colour), uppercase label | — |

## First start (ADR 0048)
Three full-window screens built from the `c8-` blocks, centred, one job each: (1) brand and "Opening Google sign-in…",
or the fallback with an error box and "Continue with Google"; (2) "Step 2 of 3", calendar reason, "Connect Google
Calendar" and a quiet "Not now" (waiting and failed looks); (3) "Step 3 of 3", one question and one focused field.
Screens: `docs/evidence/simplicity/pr3/`.

## Home (ADR 0049)
One column of at most `--content-width` (640px): small greeting; the Next card (label "Next", checkbox, title, due date
in words plus estimate, the page's one filled button "Start focus 25 min", ⋯ menu); two more to-dos as `.c8-row`s; the
add row (`N` focuses it); "All to-dos (n)"; then, at the bottom, the chip "Plan a session" and the chat composer.
While a session runs the card says "Now", "Focus ends at …" and shows the dark `.c8-pill` with the time left. Inside a
chat the card shrinks to one line (`.c8-next--compact`) with a secondary "Start focus". With no open to-do the card holds
the field "What is the next thing you need to get done?" and a quiet "Just start 25 min". Under 560px the start button
spans the card. Screens: `docs/evidence/simplicity/pr4/`.

## Texts and languages (ADR 0047)
Every new text goes through `I18n.t('English text')` with a single-quoted literal and gets German ("du"), French ("tu")
and Spanish (Spain) entries in `frontend/i18n/de.js`, `fr.js`, `es.js`; `frontend/test/i18n.test.js` fails otherwise.
Values such as a to-do title go in as `{name}` patterns and are never translated. Everyone sees English until the
language switch (CON-43); `?lang=de|fr|es` forces a language for testing.

## Behavior and data
- State lives in the browser (`localStorage`, key `articul8-wireframe-v2`).
  The backend is not connected yet.
- Scripts expose global objects on `window`: `Articul8` (state), `Product`,
  `FocusUI`, `WorkflowUI`, `ProductPages`, `CalendarUI`, `ToolPages`,
  `Wellness` (meditation), `BodyRooms`, `Insights`, `createVoiceCapture`,
  `announce`, `setAgent`. Reuse them, do not duplicate their logic.
- Room preview uses camera, microphone and screen capture in the browser only.
  Audio files added on the Music page stay in the browser.

## Accessibility already in place (keep it)
Google Calendar is managed in an AI-generated dialog reached from Profile >
Settings. It reuses calendar dialog/field and wire-button styles. Setup,
signed-out, connected, selection-count and failure states use text, not color.
Tasks and each selected Google calendar have existing wire-button chips above the grid synchronized
with the rail checkboxes. Google blocks are grey with a dashed sage border;
details say “Google · Read only” and offer no edit, drag or focus action.

Calendar's AI-generated “Find study time” rail block reuses form controls and
wire buttons. It names the task and estimated minutes, shows the first free
slot in words, then opens the existing editor with “Add to calendar”.

- Visible focus ring on buttons and inputs.
- The `hidden` attribute hides elements (`[hidden]` is forced to display none).
- `.sr-only` text for screen readers, `aria-label` on icon buttons,
  `aria-current="page"` on the active sidebar button.
- `prefers-reduced-motion` is respected.

## Calendar redesign (AI generated for review)
- Calendar remains inside `frontend/index.html`; `frontend/calendar-tools.js`
  contains dependency-free local date arithmetic and quick-add parsing.
- The calendar uses a left mini month and visibility rail, a quick-add field,
  Day / Week / Month controls, a tabular time gutter, thin `--line` grid lines, and
  the shared tokens (ADR 0046). Its own small text sizes stay (dense grid, ADR 0046 exception). At 800px the rail is hidden
  before the seven-column week becomes cramped; below 700px the initial view is
  one day.
- Tasks keep a light `--surface-muted` block, deadlines are dark (`--ink`) with light text, and
  Google events are visibly read-only and dashed. External events remain in
  CalendarUI memory and are never passed to Concentr8 storage.
- The current-time marker follows the browser's local timezone. The quick-add
  parser accepts explicit dates, today/tomorrow, weekdays, a time, and duration;
  invalid or ambiguous text opens the existing event editor without saving.
- New calendar surfaces carry a quiet “AI generated” marker for review. This
  is a calendar-only exception approved in the calendar redesign plan and ADR
  0028; no other page is restyled.

## iPhone app (AI generated, for Jack to redraw)
The phone screens use the same tokens as Swift constants in `ios/Shared/DesignTokens.swift`. No new colours.
- Shield screen ("Are you focused?"): `--paper` background, `--ink` title, `--muted` subtitle. The main button is
  `--selected` with `--ink` text instead of `--action` with `--action-ink`, because iOS 27.2 drew the light text on
  the terracotta button too dark to read. The second button is `--action` text on the system's light button.
- No visible "AI generated" text on the shield (ADR 0044); the home screen keeps its marker.
- App icon and shield icon reuse the desktop icon (`app/build/icon.png`): the same green and round bear, redrawn edge
  to edge for iOS.

## How to check a change did not alter the look
Render the same screens before and after and compare them pixel by pixel
(Home, Calendar, Toolbox, Courses, Workflow, Profile, the tool pages, Focus,
agent panel at 1440 and 1000 px wide). That is how the cleanup PRs were
verified.

## Known rough edges (not fixed, no look decision yet)
- The older pages (Toolbox, Workflow, Courses, Profile, Focus) use heavier
  borders and cooler greys than the newer tool pages. The look is Jack's and
  stays as it is until the team decides to unify it.
- On the Music page the frame of the selected card covers only the picture
  and name, not the bottom row.
- Calendar layout and word-boundary wrapping are addressed in the calendar
  redesign; other pages and the order of existing style blocks remain unchanged.
- The style blocks override each other (10 blocks). Merging them is a
  separate cleanup PR.
