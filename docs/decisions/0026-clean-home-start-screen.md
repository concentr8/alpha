# 0026. Clean Home start screen (supersedes ADR 0001 and 0007 for the Home page only)

Status: Accepted (Jonas, 2026-10-30)
Date: 2026-10-30
Deciders: Jonas (Jack to redraw the page)

## Context
Home showed a mood row, the chat box and a permanent to-do column. Jonas wants a calm start: every time the app opens
the student sees a clean page, the three most urgent to-dos and the chat box. Plan: docs/plans/home-chat-tools.md.

## Decision
- The mood row ("How are you feeling?") is removed completely, with its state and its CSS. Tool suggestions still react
  to words in the chat text; they no longer react to a mood.
- Home shows a greeting (by time of day, with the name from Profile) and "Up next": the three open tasks with the
  earliest deadline, in one swipeable row (two lines per card: title, due date), plus a last card "All to-dos".
- The full to-do list is the old right column. It is hidden and opens on "All to-dos" (close button or Escape).
- The page is marked AI generated in an `AI-GENERATED:` comment. TODO: Jack redraws it; the visible `.preview-note`
  is a very quiet one-line variant (ADR 0027), as Jonas asked: as subtle as possible, but Jack can still see it.

## Consequences
- Good: calmer first screen, one row of what matters next.
- Harder: the mood is no longer saved, so old saved moods are ignored.
- New texts to translate (docs/plans/languages.md): "Good morning/afternoon/evening", "Up next", "All to-dos", "N open",
  "Due today", "Due tomorrow", "Overdue", "No due date", "Close to-do list".
