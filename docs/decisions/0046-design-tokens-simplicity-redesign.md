# 0046. Design tokens of the simplicity redesign

Status: Accepted (2026-11-10). Plan: `docs/plans/simplicity-redesign.md`, PR 1. Decisions: ADR 0045.
Purpose: one set of colours, sizes, spacing and motion values that every later redesign step uses.

## Context
The audit (`docs/design/audit.md`, A15-A17) found muted text under 4.5:1 on the sidebar, control edges under 3:1,
five different focus-ring offsets, 46 font-size declarations and transitions that ignore reduced motion.
Jonas chose Jack's warm look with two contrast fixes (ADR 0045).

## Decision
- The `:root` block in the theme styles of `frontend/index.html` carries semantic names from
  `docs/design/mockups/tokens.css` (`--bg`, `--surface-sunken`, `--ink-2`, sizes, motion). Old names stay as aliases
  (`--paper`, `--sidebar`, `--body-ink`, `--ink-hover`) until PR 5 replaces them. `--hover` keeps its own value,
  because the sidebar is `--surface-sunken` and a hover in that colour would be invisible there.
- `--muted` `#786657` → `#655445`; `--control` `#a08b7a` → `#8f7a69`; `--focus` `#8a5b38` → `#2a1d14`.
- One focus ring: 2px `--focus`, 2px gap. Kept exceptions: calendar events (1px, tight grid), scroll areas
  (inset, the container clips), the meditation slider (7px, clears the thumb).
- Under `prefers-reduced-motion: reduce` every transition and animation lasts 1ms and runs once.

## Measured contrast (WCAG formula)
| Pair | Ratio | Needs |
|---|---|---|
| `--muted` on `--bg` / `--surface` / `--surface-muted` / `--surface-sunken` / `--hover` / `--selected` | 6.99 / 7.11 / 5.75 / 5.45 / 5.86 / 4.78 | 4.5 |
| `--ink-2` on the same, lowest (`--selected`) | 8.01 | 4.5 |
| `--danger` on `--danger-surface` / lowest surface (`--selected`) | 6.29 / 4.96 | 4.5 |
| `--action-ink` on `--action` / `--action-hover` | 4.82 / 5.97 | 4.5 |
| `--control` on `--bg` / `--surface-muted` / `--surface-sunken` / `--hover` | 3.94 / 3.24 / 3.07 / 3.30 | 3 |
| `--focus` on any surface, lowest (`--selected`) | 10.82 | 3 |
`--control` on `--selected` is 2.70; no control edge sits on `--selected` today (checked: `--selected` is only used as
a fill for the current nav item, chat row, today's date and text selection). Keep it that way.

## Consequences
- Checkbox ticks and the text caret use `--focus` and turn from brown to near-black.
- With reduced motion, every element briefly "transitions" for 1ms when a style changes; this is invisible but a
  script that reads computed styles in the same frame sees the start value.

## Applied to the whole app (PR 5)
- Font sizes in the CSS use the five `--text-*` tokens (280 declarations). Exceptions, kept on purpose: the calendar grid
  and its dialogs (dense layout) and display numerals over 34px (timers, meditation clock, stats).
- Radii of 7-10px use `--radius-control`, 12-14px `--radius-panel`.
- Spacing values on the 4px scale (4, 8, 12, 16, 24, 32, 40, 64px) use `--space-*`. Off-scale values (10, 14, 18, 20px …)
  are left as they are: changing them would move layouts of pages this redesign does not touch.
- The old names `--paper`, `--sidebar`, `--body-ink`, `--ink-hover` are gone.
