# 0038. The product-video demo is a fork of beta.26 on its own branch

Status: Accepted (Jonas, 2026-11-04: "eine Runde forken", future releases must not build on it).
Purpose: records why the demo build lives on `demo/video-2026-11-04`, what is fake in it and what is real.

## Context
Jonas records a product video in iMovie with four or five short scenes. The video needs a full, believable student
(courses, deadlines, a busy calendar, focus history), the same result on every take, and two things that must really
happen on screen: blocking a distraction and a phone call. The real app (beta.26) has neither mock data nor a way to
repeat a scene.

## Decision
- A branch `demo/video-2026-11-04` from `v1.1.0-beta.26` (commit 251b747). It is never merged into `main`.
- Everything fake sits in `frontend/demo/` and wraps the app from outside: `window.fetch` is wrapped, so the app code
  sends the same requests as in beta.26 and only the answers are made up. Fake: bCourses (Canvas API), Google Calendar,
  Google sign-in (as "Maya Chen") and the AI chat (scripted, the same every take).
- Real: the blocker of the desktop app (warning time 10 instead of 15 seconds) and the phone calls. Only the call routes
  go to the real Concentr8 server, with a real token kept apart from the demo token (`frontend/demo/demo-api.js`).
- The app installs as "Concentr8 Demo" (own app id and data folder), so it never replaces the real app or its data.
- Its own workflow (`app-demo.yml`) publishes the pre-release `v1.1.0-beta.26-demo`. `app-beta.yml` counts only tags
  that end in a number, so the next normal beta is still `v1.1.0-beta.27`, built from `main`.
- A few small changes outside `frontend/demo/` were needed (each marked `DEMO`): script tags in `index.html`, the fake
  sign-in in `concentr8-server.js`, the warning time, the Demo menu, two IPC doors and the 16:9 window.

## Consequences
- Rules from AGENTS.md that this branch does not follow, on purpose: it changes `frontend/index.html` (only script
  tags) and it is not reviewed as a pull request into `main`.
- When the video is done the branch can stay as it is; nothing on `main` depends on it.
- If a later demo is needed, branch again from the newest beta instead of building on this one.
