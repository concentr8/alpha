# 0045. Decisions for the simplicity redesign of first start and Home

Status: Accepted (Jonas, 2026-11-10). Plan: `docs/plans/simplicity-redesign.md`.
Purpose: records five answers Jonas gave before implementation starts, including one exception to AGENTS.md.

## Decision
- Colours: Jack's warm look stays (ADR 0037); `--muted` becomes `#655445` and `--control` becomes `#8f7a69` so text passes 4.5:1 and control edges 3:1.
- The calendar step comes right after sign-in with a quiet "Not now" while Google shows the "unverified app" warning. This changes ADR 0039 (no step after sign-in) and keeps its reason (the warning). The calendar stays optional.
- To-do swipe cards are replaced by rows with a visible checkbox; swipe remains a touch-only extra (WCAG 2.5.7).
- Exception to AGENTS.md ("Jack's version wins", "AI generated" marker): for this redesign Jonas's go replaces Jack's review, and the new screens carry no visible "AI generated" note. The marker stays in the code as an `AI-GENERATED:` comment. TODO: Jack redraws the final screens later.
- Playwright may be added as a development-only dependency in `e2e/` for browser tests (AGENTS.md: no new dependency without asking; this is the ask).

## Consequences
- Good: one set of tokens that pass contrast; a calmer first start; browser tests become possible.
- Harder: the warm look carries a terracotta main button (4.8:1 with its text), so "one filled button per screen" depends on colour plus weight, not black.
