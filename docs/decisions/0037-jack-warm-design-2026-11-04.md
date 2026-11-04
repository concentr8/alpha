# 0037. Jack's warm design of 2026-11-04

Status: Accepted (Jonas, 2026-11-04). Source: Jack's local snapshot `Concentr8-2026-11-04-local.html`.
Purpose: records what the second snapshot changed and how it was merged. Applies the rule of ADR 0036 again; does not change it.

## Context
Jack sent a new self-contained snapshot the day after the redesign. `main` already had his first snapshot plus Google
sign-in, time estimates, profile picture and the minimal Start focus (ADR 0036).

## Decision
Same rule as in ADR 0036: for the frontend, Jack's version wins; what was built meanwhile stays where it does not clash.
- The new snapshot was brought into the repo layout first: bundled scripts back to `<script src>`, music back to
  `frontend/music/`, snapshot note removed. His new `chat-scroll.js` is its own file with Node tests.
- Then it was merged with `main` three-way, against the first snapshot as the common base. Two spots clashed and
  were resolved by hand: the profile button in the sidebar (his Home scroll call plus our profile picture) and the
  To Do List row (his multi-line title field plus our "45 min" next to the due date).
- Fonts (Bricolage Grotesque, Lexend) stay embedded in `index.html` as he sent them, with the licence texts in the
  `bundled-licenses` block (SIL Open Font License asks for the licence to travel with the font).

## Not taken over
Jack's snapshot bundles old copies of `concentr8-server.js`, `concentr8-blocker.js`, `concentr8-google-calendar.js`,
`chat-history.js` and `calendar-tools.js`: they lack Google sign-in and the browser sign-in (ADR 0032, 0035) and
have older texts. The files in `frontend/` stay as they are, so sign-in keeps working. TODO: tell Jack to build his
snapshots from the current `main` so these copies match.

## Consequences
- New warm look everywhere: tokens are in `docs/design.md`. Our few own styles use the same variables.
- Chats stay in the browser (ADR 0036); the new scroll rule only changes where the view stops.
