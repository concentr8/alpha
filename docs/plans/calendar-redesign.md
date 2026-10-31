# Calendar that is easier to use

Purpose: implementation plan for the Calendar page; read by the team before
editing calendar.css and calendar.js in frontend/index.html.

Approved by Jonas in the calendar brief on 2026-10-31. Refines ADR 0001 only
for the calendar blocks. No other page is redesigned, no dependency is added.

1. Commit this plan and calendar-wireframes.md before code.
2. Capture the existing calendar at 1440 and 390 pixels using demo data only.
3. Reuse Arial, grey/white and sage tokens and existing wire-button controls.
   Add a mini month and calendar visibility rail, a quiet fluid grid and
   Day/Week/Month controls. Below 700 pixels start in Day.
4. Preserve editing, drag creation/moving/resizing and the existing save/draft
   flow. Add explicit quick-add parsing (no AI), shortcuts, date navigation,
   current-time line, current-time scrolling and accessible state messages.
5. Mark new surfaces AI generated for Jack. Keep Google data outside locally
   saved tasks; supply an extension point for read-only calendars.
6. Document the changed look and decision. Test pure parsing and existing
   server behavior. Capture after screenshots at both widths.

Design states: empty range says no events and offers New; loading retains
local tasks; Google failure says retry; stale events remain visibly marked
with last refresh time. A missing connection never hides local events.

Review: PR 1 targets main. Subsequent feature branches build on the preceding
branch so the three PRs show only their own package. Never merge or force-push.

Open questions are recorded in the PR instead of inventing a new design,
dependency or secret.
