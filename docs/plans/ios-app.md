# Plan: Concentr8 iPhone app (phone companion with app blocking)

Status: Go given by Jack (2026-11-07). Phase 1 is specified in `docs/plans/ios-app-phase-1.md`.
Goal: an iPhone app that is the phone side of Concentr8. A blocker on the
laptop does not help if the student can still pick up the phone. The app blocks
distracting apps during a focus session, asks the student whether they are
focused, shows the next tasks, and lets them talk to the Concentr8 AI.

## What we know (checked 2026-11-07)
- The Apple Developer Program was joined on 2026-11-06.
- Apple assigned the Family Controls (Distribution) entitlement to our account
  on 2026-11-06 (Apple e-mail). TODO: check it can be switched on for every
  bundle ID below. Apple's docs say an app with a Screen Time extension must
  request the entitlement for the extension too:
  https://developer.apple.com/documentation/xcode/configuring-family-controls
- App blocking uses three Apple frameworks: FamilyControls, DeviceActivity,
  ManagedSettings. Our own code cannot read what a student does in other apps
  (the usage report runs in a sandbox that hides it). This comes from a
  consultancy page, not from Apple. So the direct question "are you focused?"
  is how we get the data, instead of guessing from app usage.
- A blocked app can show our own screen with buttons (shield extensions).
  Another app already uses this to ask a quiz question before an app opens
  (Apple forum thread "Family Controls Entitlement Blocking App Store Release").
- It only fires for apps the student chose to block. It does not fire every
  time the student picks up the phone.
- Apple's advice: test on real devices, not only in the simulator.
- Reported in the Apple forum, not verified by us: blocking did not work for
  external TestFlight testers in one case. Test this early.

## Name and identifiers (confirmed by Jonas, 2026-11-07)
- Name: Concentr8
- App: `app.concentr8.ios` (the Mac app is `app.concentr8.mac`)
- Extensions: `app.concentr8.ios.monitor` (DeviceActivityMonitor),
  `app.concentr8.ios.shieldconfig` (ShieldConfiguration),
  `app.concentr8.ios.shieldaction` (ShieldAction)
- App Group (app and extensions share data): `group.app.concentr8.ios`
- TODO: we do not own a domain yet. Apple does not need one for a bundle ID, but
  the ID cannot change after the app is created in App Store Connect. Ask Jack
  whether `concentr8.app` is ours before the first upload.
- The Xcode project is generated from `ios/project.yml` with XcodeGen (ADR 0043).

## Look
Reuse docs/design.md. No new colours, fonts or layouts.
- Colours: `--paper #fffbf2`, `--surface #fffdf8`, `--ink #2a1d14`,
  `--muted #786657`, `--line #e2d6c9`, `--action #b4532f` (pressed `#9f4728`),
  `--selected #f2cab6`, `--danger #9b2948`.
- Fonts: Bricolage Grotesque (titles), Lexend (text), both under the SIL Open
  Font License. TODO: take the font files from the licence block in
  `frontend/index.html` and keep the licence texts.
- Corners 8 px (controls) and 12 px (panels). Thin warm borders, almost no shadows.
- App icon: `app/build/icon.png` (1024 x 1024).
- docs/design.md says there is no phone layout yet. The phone screens are new, so
  they are built from the same tokens and marked "AI generated" in the screen
  and in a code comment, so Jack can redraw them (AGENTS.md rule).

## Phases (each ends with something that can be tried)
1. Blocker and focus check (first overnight run)
   - SwiftUI project with a small design system from the tokens above.
   - Screen Time permission (individual authorization) and the app picker.
   - Start and stop a focus session: chosen apps are shielded.
   - Shield screen: "Are you focused?" with a few answers (for example: working
     on my task, on a break, not focused). The answer is stored in the App Group.
     Phase 1 keeps it on the phone only.
   - Next tasks: a list with sample data until the server contract is known.
2. Tasks from the Concentr8 server, and breaking a task into small steps.
3. AI chat and workflow planning through the Concentr8 server. No API key in
   the app (AGENTS.md: secrets only on the server). TODO: check what Apple wants
   to be shown to the student before data goes to an AI service.

## Done when (phase 1)
- The app and all three extensions build with `xcodebuild` without errors.
- Unit tests for the plain logic (session timing, answers) pass.
- The blocker is tried on a real iPhone by a human.
- docs/architecture.md lists every new file.

## Rules for an unattended run
- Work only on a branch, commit often, never on `main`.
- Do not touch `frontend/index.html` or the server.
- Build with a project-local `-derivedDataPath` so it can be deleted afterwards
  (the Mac has little disk space).
- Allowed: reading files, editing files, `xcodebuild`, `git add`, `git commit`.
  Set a turn limit and a spending limit for the run.
- Never invent a design: only the tokens above.

## Open questions
- Where do tasks live and which server call returns them?
- What does "AI board" mean for the chat: a chat, a board, or both?
- Does the answer to "are you focused?" go to the server? That needs a privacy
  text before the App Store.
- Can the student end a session early, and how hard should that be?
- Minimum iOS version. iPhone only, or iPad too?

## Risks
- The entitlement may not cover the extensions yet.
- Apple reviews Screen Time apps closely and can be slow (forum threads report
  waits of weeks for the entitlement). Ours is already assigned.
- The shield only covers apps the student picks.
