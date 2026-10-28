# 0005. Remove dead CSS from the frontend

Status: Proposed (accepted when the pull request is merged)
Date: 2026-10-20
Deciders: Jonas, Jack
Refines: 0001 (frontend stays unchanged)

## Context
The first style block of frontend/index.html (pages.css) still holds styles of
an earlier wireframe. 21 CSS classes in it are not used by any element or
script, for example tool-tile, week-calendar and wire-dialog. They add 47
selectors that nobody can use, and they make the file harder to read.

## Decision
Remove only CSS rules that style those unused classes. Markup, scripts and
every rule that is still used stay as they are. Look and behaviour of the
frontend stay frozen.

How we checked: the page was rendered before and after (Home, Calendar,
Toolbox, Courses, Workflow, Workflow builder, Profile, Focus, open agent
panel) at 1440 and 1000 px width. All screenshots are pixel-identical and the
browser console shows no errors.

## Consequences
- Good: about 3.5 KB less CSS, and less to read for new developers.
- Not done on purpose, each needs its own pull request: duplicate rules
  between style blocks, the unused music placeholder `Sound` in the focus
  code, and the migration of old sample titles in the state code.
