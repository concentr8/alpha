# 0028: A quiet, local-first calendar

Status: accepted for the calendar redesign plan.

## Context

The existing week grid was difficult to scan at intermediate widths, always
opened around 09:00, and had no date rail or safe quick-add path. The approved
calendar wireframes call for a mini month, visible local-calendar filters,
Day/Week/Month navigation, a current-time marker and an accessible quick-add
draft. A later package will connect Google Calendar; the frontend must not
persist those provider records as local events.

## Decision

- Keep the implementation in the approved calendar CSS and JavaScript blocks
  in `frontend/index.html`. Use only Arial, existing grey/white/sage values,
  existing button styles and no new package.
- Add `frontend/calendar-tools.js` as a pure UMD/CommonJS utility. It provides
  browser-local date helpers and an explicit parser for date, weekday, time and
  duration input. Ambiguous or incomplete text is sent to the existing editor,
  not interpreted by AI and not saved automatically.
- Keep local event editing, delete/undo, focus, chat proposals, and pointer
  create/move/resize in the existing CalendarUI and Articul8 flows. `CalendarUI`
  exposes `getRange()` and `setExternal()` for future read-only integrations.
  External events stay in CalendarUI memory, are dashed, and have no edit,
  focus, drag or save path into Articul8.
- Resolve “today” from the browser's local timezone. A week view remains seven
  fluid columns, the rail hides before the columns overflow at intermediate
  widths, and phones start in Day view.
- Mark new surfaces with a quiet visible “AI generated” note and a source
  comment so Jack can review them.

## Consequences

Quick-add and timezone boundaries are tested with Node's built-in test runner.
External-calendar loading/error/stale/ready states can be supplied through
`setExternal()` without coupling PR1 to Google credentials or API calls. The
Google settings and provider connection remain out of scope for this decision.
