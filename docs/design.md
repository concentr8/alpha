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
| Use | Variable | Value |
|---|---|---|
| Page background | `--paper` | `#fffbf2` |
| Cards, dialogs | `--surface` / `--surface-muted` | `#fffdf8` / `#f1e3d7` |
| Sidebar | `--sidebar` | `#efddc8` |
| Text / secondary text | `--ink` / `--body-ink` | `#2a1d14` / `#4a3020` |
| Muted text | `--muted` | `#786657` |
| Dividers / control borders | `--line` / `--control` | `#e2d6c9` / `#a08b7a` |
| Selected / hover | `--selected` / `--hover` | `#f2cab6` / `#f7e4d6` |
| Main button (and progress) | `--action` (`--action-hover`, `--action-border`, `--action-ink`) | `#b4532f` (`#9f4728`, `#924124`, `#fffbf2`) |
| Progress, soft | `--progress`, `--progress-soft` | `#b4532f`, `#c88d6d` |
| Error | `--danger`, `--danger-surface` | `#9b2948`, `#f8e7ec` |
| Focus ring | `--focus` | `#8a5b38`, 2px, offset 5px |
| Shadows, backdrop | `--shadow-color`, `--shadow-faint`, `--backdrop` | brown at 10%, 4%, 20% |
| Fonts | `--font-display` / `--font-body` | Bricolage Grotesque / Lexend |
| Corners | `--radius-control` / `--radius-panel` | 8px / 12px |
Use the variables, not new hex values. Pixel sizes of titles and rows below were
measured before the warm look and may be a little off; the CSS is the truth.

## Layout
- `.app` is a 3-column grid: sidebar 224px, content (flexible), agent panel 336px.
  Minimum width 760px, so there is no phone layout yet.
- Pages (Jack, 2026-11-03, ADR 0036): Home, Courses, Toolbox, To Do List, Data,
  Calendar in the sidebar (buttons with `data-page`), plus Workflow, Profile, Focus,
  Room and Break. A hash router shows them (`#calendar`, `#todos`, `#data`,
  `#toolbox/music` etc.).
- Home (Jack): a chat switcher top left (`.chat-switcher`, history panel
  `.chat-history`), the greeting, `.home-question` "What's on your plate right now?",
  `.quick-start-options` (Quick Start) and, in a focus chat, `.focus-chat-actions`
  (Start focus session). The AI button is hidden on Home.
- Toolbox detail pages: Timer, Body Doubling, Music, Block App, Breathing
  Exercise, Meditation (and Saved sessions), Checklist.
- Content pages use `.page-content` and start with `.product-heading` (title,
  optional `.text-back`, buttons on the right).
- Responsive steps: 1250, 1200, 1100, 960, 900, 850, 780, 700 px. Detail pages
  (Room, Block App, Meditation, Timer) fill the window height (`100dvh`).

## Components (class names to reuse)
| Class | Use | Key facts |
|---|---|---|
| `.wire-button` | Every normal button | min-height 48px, border 1.5px `#bdbdbd`, radius 7px, 18px text |
| `.wire-button.solid` | The one main action | background `#292929`, white text |
| `.icon-button` | Icon only (close, menu) | 44x44px, transparent, hover `#eee`; needs `aria-label` |
| `.text-back` | "Back" link at the top | no border, 17px, color `#555` |
| `.chat-action` (`.solid`, `.quiet`) | Small button under an answer of Concentr8 (ADR 0027) | 30px high, 14px text, 1px `--ink` border, radius 8px; Enter confirms the newest one (`kbd` hint) |
| `.chat-note` / `.chat-undo` | Plain line "Added to to-do: … · Undo", no box | 14px, grey `#666` |
| `.chat-tool` | Tool card inside the chat (name + Open) | 1px `#d6d6d6`, radius 12px, max 380px |
| `.preview-note.quiet` | "AI generated" marker for Home, as quiet as possible | 11px, `#9a9a9a`, no box |
| user message | Dark bubble: `--ink`, white text, radius 18px (answers have no bubble) | |
| `.message-action` | Small text action in chat | underline on hover |
| `.product-form` | Forms in dialogs | grid, gap 22px, inputs 48px high, 1px `#bbb` border, radius 6px |
| `.cal-field` | Labelled field in calendar forms | same input look as `.product-form` |
| `.dialog-actions` | Button row at the bottom of a dialog | right-aligned, gap 12px |
| `.section-toolbar` | Heading with actions on one line | space-between |
| `.preview-note` | Grey hint box ("preview only") | background `#f4f4f4`, 16px |
| `.empty-message` | Empty list text | 18px, `#666` |
| `.stat-row` | Three numbers in a row | big 38px numbers |
| `.template-grid` | Cards in 3 columns (2 when narrow) | gap 22px |
| `.avatar` | Round initials | 40px, `#eee` |
| `.chat-switcher` / `.chat-history-row` | Chat title button and its history list on Home (Jack) | pill 40px high, `#f4f4f2`; rows 44px, current row `#f4f4f2` |
| `.quick-start-options` / `.focus-chat-actions` | Small button with a grey hint next to it (Jack) | 40px button, `#dedede` border; hint 14px `#777` |
| `.chat-pending` | "Concentr8 is thinking…" under the chat (Jack) | 16px, `#777` |
| `.cal-toolbar` / `.cal-toolbar-actions` | Calendar's one toolbar row (Jack) | 40px controls, range 20px |
| `.profile-picture`, `.avatar img` | Profile picture (AI generated, not drawn by Jack) | 72px on Personal information, 32px in the sidebar |
| `.detail-heading` | Header of a tool page: `.text-back`, `h1`, `.detail-actions` on the right | 28px title, actions push right |
| `.detail-section`, `.detail-note`, `.detail-empty` | Block with 21px/500 title, grey note, empty text | notes `#737373`, 16px |
| `.detail-search` | Search field with icon and button | 1px `#ccc`, radius 6px |
| `.ambient-card` | Music card with picture and name | 1px `#eaeaea`, radius 8px, selected = 2px dark frame around the whole card |
| `.player-bar` / `.meditation-player` | Bottom player (music, meditation) | 1px border, radius 8px / 12px, round play button |
| `.block-preset`, `.blocked-app` | Block App preset card and chip | 1px `#eaeaea`, radius 8px / 6px |
| `.check-row` | Checklist row | checkbox, text field, due date, delete |
| `.time-wheels` | Timer picker (hours, minutes, seconds) | scroll-snap wheels, selected row `#f3f3f2` |
| `.solo-timer-dial` | Clockwise timer ring | stroke 7, accent `#566b60` |
| `.data-chart`, `.activity-bar` | Insights bar chart | bars `#a6b5af` |
| `.room-grid`, `.camera-frame`, `.room-toolbar` | Body Double room | 3x2 grid, toolbar with 5 buttons |
| `.composer` | Text input with send button | 64px high, radius 8px |
| Calendar mini month, visibility rail, quick add, view switch | Calendar-only extension built from `.wire-button`, `.icon-button`, `.cal-field`, `.preview-note.quiet` | Day / Week / Month; task blocks use existing light greys, deadlines use `--ink`, read-only Google blocks use existing sage/grey with dashed borders |
Dialogs, calendar details and the agent panel are built in the scripts and
reuse the same classes.

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
  Day / Week / Month controls, a tabular time gutter, thin grey grid lines, and
  the existing Arial and grey/white/sage tokens. At 800px the rail is hidden
  before the seven-column week becomes cramped; below 700px the initial view is
  one day.
- Tasks retain a light-grey block, deadlines are dark with white text, and
  Google events are visibly read-only and dashed. External events remain in
  CalendarUI memory and are never passed to Concentr8 storage.
- The current-time marker follows the browser's local timezone. The quick-add
  parser accepts explicit dates, today/tomorrow, weekdays, a time, and duration;
  invalid or ambiguous text opens the existing event editor without saving.
- New calendar surfaces carry a quiet “AI generated” marker for review. This
  is a calendar-only exception approved in the calendar redesign plan and ADR
  0028; no other page is restyled.

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
