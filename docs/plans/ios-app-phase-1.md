# Spec: Concentr8 iPhone app, phase 1 (first unattended run)

Status: Go given by Jack and Jonas (2026-11-07). Read `docs/plans/ios-app.md` first; this file only adds what the run needs.

## Goal
One SwiftUI app plus three Screen Time extensions that build for the simulator and are covered by unit tests. The
Screen Time parts cannot be tried in the simulator (a human tries them on a real iPhone later), so the run only has to
compile them and test the plain logic around them.

## Layout (all new, under `ios/`)
- `ios/project.yml`: XcodeGen definition of the app and the three extensions (ADR 0043).
- `ios/Concentr8/`: the app (SwiftUI). `ios/Concentr8Tests/`: unit tests.
- `ios/Concentr8Monitor/`, `ios/Concentr8ShieldConfig/`, `ios/Concentr8ShieldAction/`: the three extensions.
- `ios/Shared/`: code used by the app and the extensions (session model, answer storage, design tokens).
- Identifiers: app `app.concentr8.ios`, extensions `.monitor`, `.shieldconfig`, `.shieldaction`, App Group
  `group.app.concentr8.ios`. Deployment target: iOS 26. iPhone only.

## What to build
1. Design tokens in one file in `ios/Shared/` taken from `docs/design.md` (colours, corner radii 8 and 12). Use the system
   font for now. TODO: embed Bricolage Grotesque and Lexend later; keep the licence texts.
2. Home screen: a button to choose apps to block (FamilyActivityPicker), a start and stop button for a focus session, and
   the next tasks as a list of sample data.
3. Session model in `ios/Shared/` with plain, testable logic: start, stop, remaining time. No UI code in it.
4. Shield: the monitor extension shields the chosen apps while a session runs. The shield screen shows "Are you focused?"
   with three answers (working on my task, on a break, not focused). The action extension stores the answer with a time in
   the App Group. Answers stay on the phone in phase 1.
5. Entitlements files for the app and each extension: Family Controls and the App Group. TODO in the file header: signing is
   done by a human in Xcode.
6. Every new screen shows a small "AI generated" label and has an `AI-GENERATED:` comment, so Jack can redraw it.

## Done when
- `cd ios && xcodegen generate` succeeds.
- `xcodebuild -project ios/Concentr8.xcodeproj -scheme Concentr8 -destination 'generic/platform=iOS Simulator'
  -derivedDataPath ios/.build CODE_SIGNING_ALLOWED=NO build` succeeds, including all three extensions.
- Unit tests pass on any iPhone simulator (list them with `xcrun simctl list devices available`).
- `docs/architecture.md` lists every new file in the same commit as the file.
- Every file starts with a header comment: purpose, who calls it, what it calls. Unfinished parts are marked `TODO:`.

## Rules for the run
- Branch `feat/ios-phase-1` from `main`. Never work on `main`. Commit after every finished step. Do not push and do not open a
  pull request; a human does that in the morning.
- Do not touch `frontend/`, `server/`, `backend/` or `app/`.
- Only the tokens in `docs/design.md`. No new colours, fonts or layouts.
- No secrets, no API keys, no real phone numbers anywhere.
- No new dependency except XcodeGen. Do not install anything.
- Allowed commands: reading and editing files, `xcodegen`, `xcodebuild`, `xcrun simctl list`, `git add`, `git commit`,
  `git status`, `git diff`, `git log`. No `rm`, no `git push`, no `git reset`, no force flags.
- If the same build error is still there after three tries, stop that step, write what is missing as a `TODO:` and the
  reason in the "Run log" below, and go on with the next step.
- Keep `ios/.build/` out of git (add it to `.gitignore`).

## Run log
(The run adds a short entry per step here: what was done, what failed, what is left.)
