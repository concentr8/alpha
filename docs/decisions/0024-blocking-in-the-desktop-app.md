# 0024. Blocking and the AI check live in the desktop app (builds on ADR 0021, 0022)

Status: Accepted (Jonas, 2026-10-28)
Date: 2026-10-28
Deciders: Jonas

## Context
The Cal Hacks app blocked distractions on the Mac (AppleScript), sent notifications and asked Claude whether the screen fits
the task. It worked. Jack's app has a Block App page that only keeps a list. A web page cannot see other programs.

## Decision
- The blocker is ported to plain JavaScript in `app/desktop/` (no TypeScript toolchain, no new dependency).
- The page talks to it through one small preload door, `window.concentr8Desktop`.
- Blocking runs only in focus phases of sessions that include the Block App tool.
- The AI check uses the server route `/api/relevance`; the app holds no API key.
- The panel on the Block App page is marked "AI generated" so Jack can redraw it.

## Consequences
- Good: the working logic is kept, tests are kept, Jack's page and focus code stay as they are.
- Harder: only macOS can see and block; Windows and Linux show a hint. Real behaviour needs a Mac to try.
- The app is unsigned, so macOS asks again for Automation after every update until signing exists.
