# 0021. App code and builds in alpha, stable downloads on the site repo

Status: Accepted (Jonas, 2026-10-28)
Date: 2026-10-28
Deciders: Jonas

## Context
The Cal Hacks app built releases from one repo and published downloads to a
second public repo. We now want two repos in total (`alpha`, `concentr8.github.io`)
and Jack's wireframe as the only UI.

## Decision
- `alpha` holds code and all builds. Betas are GitHub Pre-releases.
- Stable releases are created in `concentr8.github.io` by the manual workflow
  "Promote to stable", which copies the tested beta files.
- The app shell is Electron, as in the Cal Hacks app (already working,
  plain JavaScript, builds for Mac, Windows, Linux). This settles the open
  question in docs/plans/mac-app.md; Tauri stays possible later.
- New dependencies, only in `app/`: `electron`, `electron-builder`.

## Consequences
- Good: one place for code; stable files are the ones that were tested.
- Harder: needs the secret `RELEASE_TOKEN`; the Mac app is unsigned until we
  join the Apple Developer Program.
- `releases/latest` ignores Pre-releases, so the site's stable link never
  serves a beta.
