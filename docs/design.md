# Design of the frontend (as built by Jack)

The look is defined by `frontend/index.html`. This file describes it so a new
person or AI reuses it. Facts below were read from the CSS in that file.

## The rule
Do not invent new buttons, colors, fonts or layouts. Reuse the classes below.
If something is missing, copy the closest existing class, say so in the pull
request, and add it here. Any visual change needs a human "go" (ADR 0001).

## Look in one sentence
A plain grey-and-white wireframe: Arial, thin light-grey borders, one dark
button style, warm off-white for hover and selected states, and one muted sage
green used only for progress (timer ring, meditation slider,
charts). Almost no shadows (only two barely visible ones).

## Tokens (exact values in the CSS)
| Use | Value |
|---|---|
| Text, dark buttons (`--ink`) | `#292929` |
| Dividers (`--line`) | `#dedede` |
| Card borders and row dividers on the newer pages | `#eaeaea`, 1px (older pages: `#bdbdbd`, `#c8c8c8`) |
| Hover on cards and rows on the newer pages | `#f7f7f5` |
| Selected card or tab on the newer pages | `#f4f4f2` |
| Accent for progress (timer ring, meditation slider, charts) | `#566b60`, `#a6b5af` |
| Sidebar background (`--sidebar`) | `#f8f8f8` |
| Page background | `#fff` |
| Control border | `#bdbdbd`, 1.5px (inputs in forms: `#bbb`, 1px) |
| Selected / hover backgrounds | newer pages `#f4f4f2`, `#f7f7f5`; older pages and sidebar `#eaeaea`, `#f0f0f0`, `#f5f5f5` |
| Muted text | `#555`, `#666`, `#777` |
| Font | Arial, Helvetica, sans-serif, 18px, line-height 1.4 |
| Page title `h1` (all pages, also tool detail pages) | 28px, weight 400 |
| Section title in detail pages | 21px, weight 500 |
| Corners | cards 8px, buttons and inputs 6-7px, round avatars `50%`, player bars 8-12px |
| Focus ring | 2px solid `#292929`, offset 5px (`:focus-visible`) |
Only `--ink`, `--line`, `--sidebar` are CSS variables; other colors are written
directly. Do not add new greys or new accent colors.

## Layout
- `.app` is a 3-column grid: sidebar 224px, content (flexible), agent panel 336px.
  Minimum width 760px, so there is no phone layout yet.
- Pages: Home, Calendar, Toolbox, Workflow, Courses, Profile (sidebar buttons
  with `data-page`), plus Focus, Room and Break. A hash router shows them
  (`#calendar`, `#toolbox/music` etc.).
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
| `.up-next-row` / `.up-next-card` | "Up next" row on Home (AI generated, ADR 0026) | cards 230px wide, 1px `#eaeaea`, radius 8px, hover `#f7f7f5`, swipeable (scroll snap) |
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
  CalendarUI memory and are never passed to Articul8 storage.
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
