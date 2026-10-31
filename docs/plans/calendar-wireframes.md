# Calendar wireframes for Jack

Purpose: text-first wireframes for desktop, phone and Google connection;
read before calendar implementation. All additions are AI generated for review.

## Desktop week
Calendar heading, quiet AI generated note, Today T, previous/next controls,
date range and Go to date G. Day / Week / Month and New N are existing button
styles. A quick-add field accepts “study OR sheet tue 3pm 2h”; submitting
prepares a draft, never saves without confirmation.

Left rail: month heading with arrows, weekday labels and a small month grid.
The visible week is highlighted; selecting a date jumps there. Beneath is
Calendars: checkboxes for Tasks and Deadlines, later one per Google calendar.
Main region: time gutter in tabular numerals, quiet hourly lines, seven fluid
columns, all-day row, short-radius soft event blocks and a now line with dot.
Task blocks are light grey; deadlines are dark with white text. Titles wrap
only at word boundaries. Empty / loading / failure / stale labels use words.

## Phone day
Below 700 pixels, initially show one day. Wrap the toolbar without sideways
page scroll. Previous/next arrows move one day. Calendar toggles remain
available in a compact rail disclosure. Grid stays vertically scrollable;
no squeezed seven-day grid. Month stays available as an explicit view.

## Connect Google Calendar dialog
Profile > Settings opens an existing-style dialog with an AI generated note.
Explain read-only access and that credentials never reach the page. Before
server setup show “Not set up yet”; before Concentr8 sign-in explain which
existing account is required. Connect launches Google's consent in a new
window. Once connected, list available calendars with checkboxes, maximum
three selected; Save selection and Disconnect have explicit feedback.
Calendar event details show “Google · Read only”, and no edit/move controls.
School-admin blocking has no automatic workaround; ICS is a future fallback.
