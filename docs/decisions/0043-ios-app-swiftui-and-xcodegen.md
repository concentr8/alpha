# 0043. The iPhone app is native SwiftUI and its Xcode project is generated with XcodeGen

Status: Proposed (Jonas's go, 2026-11-07; Jack gave the go for the plan). Plan: `docs/plans/ios-app.md`.
Purpose: tells the team why the phone app is not a web or cross-platform app, and why the Xcode project file is generated.

## Decision
- The iPhone app is written in SwiftUI. The three Screen Time pieces (app blocking, the "Are you focused?" shield screen
  and the shield button actions) need Apple's FamilyControls, DeviceActivity and ManagedSettings frameworks, which are
  native.
- The Xcode project is generated from `ios/project.yml` with XcodeGen. The generated `.xcodeproj` is not committed.
- XcodeGen is a developer tool installed with Homebrew. It is not part of the app and is not in `backend/requirements.txt`.
  Jonas agreed to it on 2026-11-07 (AGENTS.md: no new dependency without asking).

## Why
- A new Swift file or extension only has to be listed in `project.yml`. An unattended run can add files without breaking a
  project file that is hard to read and merge.

## Consequences we accept
- Everyone who builds the app first runs `xcodegen`.
- If XcodeGen is missing a setting, we write it in `project.yml` by hand.
