# 0007. Adopt the frontend version of 2026-10-21

Status: Proposed (accepted when the pull request is merged)
Date: 2026-10-23
Deciders: Jonas
Supersedes: 0005, 0006 (their cleanups are not in the new file)
Refines: 0001 (frontend stays unchanged)

## Context
ADR 0001 says changing the frontend needs a plan and its own ADR. Jonas has a
newer version of the single-file UI (`Articul8-2026-10-21.html`, 2140 lines
instead of 1760) and wants it in the repo. It adds pages and tools: Music
player, Meditation, Timer, Block App with presets, Checklist, Body Double
rooms, mood words instead of mood faces on Home, and a calendar rework.

## Decision
`frontend/index.html` is replaced byte for byte by that file, with no change
of our own on top. It is still one file and stays frozen again from this pull
request on (0001 applies to the new version). The look stays Jack's.

How we checked: the page loads in headless Chromium with no console errors,
and Home, Calendar, Toolbox, Courses, Workflow, Profile, Music, Meditation,
Timer, Block App and Checklist all render their own heading. 30 click checks
pass (navigation, adding a course, checklist item, block preset, timer start,
pause and end, meditation play, reload keeps data, no sideways scrolling at
1000 and 800 px).

## Consequences
- The cleanups of 0005 (dead CSS) and 0006 (empty `Sound` object) are gone:
  the new file has the `Sound` object and old CSS again. Redo them in
  separate pull requests if wanted.
- docs/design.md is updated to the new look and lists known rough edges.
- Camera, microphone and screen capture are used locally in the room preview
  (browser permission prompts). Nothing is sent to the backend.
