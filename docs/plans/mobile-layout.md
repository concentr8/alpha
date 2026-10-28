# Plan: Phone layout

Status: BUILT (Jonas gave the go in chat on 2026-10-23). Jack to review.

## Problem
Below 760 px width the page stayed 760 px wide (`.app { min-width:760px }`)
with three columns. On a phone only the menu and the start of the content
were visible, the rest was cut off.

## What we changed (frontend/index.html, three small parts)
1. A new style block `mobile.css` at the end, active only at 760 px width or
   less: one column, the menu slides over the page, cards and lists stack,
   the agent window fits the screen.
2. The menu starts closed on a phone (`collapsed` default follows the screen
   width), and closes again after choosing a page.
3. No new buttons, colors or layouts: it reuses the existing menu toggle and
   design tokens.

## Proof that nothing else changed
Screenshots of the page at 1280, 1024 and 800 px (Home, Calendar, Courses,
Toolbox) before and after are pixel-identical. At 390 px the page width went
from 760 to 390 on all five pages checked. Pictures: docs/evidence/mobile-layout/.

## Not checked / TODO
- Only tested in headless Chromium, not on a real phone or Safari.
- Not looked at: timer detail, room, workflow builder, open dialogs, agent
  window on a phone.
- Menu: the dark area beside it does not close it when tapped.
- Saved state: a phone user who opened the page before keeps the old
  `collapsed` value from localStorage.
