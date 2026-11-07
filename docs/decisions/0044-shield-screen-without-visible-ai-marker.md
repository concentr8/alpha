# 0044. The shield screen shows no "AI generated" text

Status: Proposed (Jonas's go, 2026-11-07; waiting for Jack). Plan: `docs/plans/ios-app.md`.
Purpose: tells the team why the iPhone shield screen is the one AI-generated screen without a visible marker.
Narrows the marker rule in AGENTS.md for this one screen; does not reverse it.

## Decision
- The shield screen ("Are you focused?") no longer shows "AI generated" as its subtitle. The subtitle is a real
  sentence: "Your focus session is running. Is this app part of your task?"
- The marker stays where Jack and the team look: the `AI-GENERATED:` comment in
  `ios/Concentr8ShieldConfig/ShieldConfigurationExtension.swift` and the pull request text.
- Every other AI-generated screen keeps its visible marker (the iPhone home screen included).

## Why
- Every student sees the shield each time they open a blocked app. On the first test on a real iPhone (2026-11-07) the
  "AI generated" subtitle read like a broken screen.
- The shield has only a title, a subtitle and two buttons. There is no quiet place for a small marker like
  `.preview-note.quiet` on the web.

## Consequences we accept
- Someone reading only the shield cannot tell it is not Jack's design. Jack learns it from the pull request.
- When Jack redraws the shield, this exception ends and this ADR is superseded.
