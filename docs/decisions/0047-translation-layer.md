# 0047. Translation layer: English text as the key

Status: Accepted (2026-11-10). Implements step 1 of `docs/plans/languages.md` (way B) as PR 2 of
`docs/plans/simplicity-redesign.md`.
Purpose: every new text of the redesign ships in English, German ("du"), French ("tu") and Spanish (Spain).

## Decision
- `frontend/i18n.js` exposes `I18n.t(text, values)`. The English text is the key; a missing translation returns
  English. `{name}` patterns are filled after translating, so the student's own words are never translated and a
  value is never scanned again.
- One dictionary per language in `frontend/i18n/` registers itself with `I18n.add()`.
- `frontend/test/i18n.test.js` scans the frontend for `t('…')` literals and fails when one of the three dictionaries
  lacks an entry, when dictionaries differ, or when a translation drops a `{pattern}`. The same test file runs in CI
  through `server/package.json` (which now also runs `frontend/test/demo.test.js`, skipped before).
- Everyone gets English until the language switch exists (CON-43). `?lang=de|fr|es` forces a language for testing, and
  `<html lang>` follows it. Why not the browser language now: most of the 542 existing texts are not translated, so
  a German browser would see half German, half English.

## Consequences
- Texts must be single-quoted literals in `t()`; a variable or template literal escapes the check.
- Jonas reviews every translation (decision 4 of `docs/plans/languages.md`).
