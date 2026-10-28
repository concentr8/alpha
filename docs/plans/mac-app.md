# Plan: Articul8 as a Mac app with app blocking (like Raycast Focus)

Status: Draft, waiting for a human "go" (see AGENTS.md: plan before code).
Goal: a Mac app people download outside the Mac App Store. During a focus
session it quits and blocks distracting apps and websites.

## What we know (sources checked on 2026-10-20)
- Apple's Screen Time blocking APIs (FamilyControls, ManagedSettings) were iOS
  only in the Apple forum thread we found (iOS 16 era). We did not check whether
  that changed. So we build the blocking ourselves.
- Raycast Focus blocks "at the system level": blocked apps quit when a session
  starts, opening one is intercepted, blocked websites redirect to a block page.
  How it does this technically is not documented on its manual page.
- Tauri: ~3 MB sample app, uses the system web view, Rust optional. Electron:
  ~52 MB, bundles Chromium, plain JavaScript, bigger ecosystem.
- Outside the App Store, a Mac app needs the paid Apple Developer Program
  ($99/year) to be notarized (no "unverified" warning). A free account can build
  and share unsigned apps; other people then see a warning.

## Phases (each ends with something that can be tried)
0. Decide the shell (Tauri or Electron) with a 1-day spike: show
   frontend/index.html in a window. ADR for the decision.
1. Shell app runs the unchanged frontend (ADR 0001 stays). Unsigned build for
   friends. Goal: first real test.
2. App blocking: a small native Swift helper watches launched apps
   (`NSWorkspace`) and quits apps on the block list. The frontend only says
   "session on/off" and sends the list. TODO: check what permissions this needs.
3. Website blocking: research first (browser extension vs. network-level).
   Nothing is decided.
4. Distribution: join the Developer Program, sign and notarize, auto-update.
5. Connect the app to the backend (call feature, plan in call-feature.md).

## Open questions
- Tauri or Electron? (depends on who writes the native part, and Rust vs JS)
- Who builds the Swift helper? Neither of us has written Swift.
- Which apps/websites are on the default block list? Where is the list stored?
- Can the user quit the block early, and how hard should that be?
- Mac only for now, or Windows too?

## Risks
- Quitting other apps may be restricted or rejected by the Mac App Store, so we
  skip the store (not verified, but not needed).
- Website blocking differs per browser and may need extra permissions.
- Blocking must never cause data loss in the blocked app (unsaved work).
