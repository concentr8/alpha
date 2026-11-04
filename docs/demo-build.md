# Demo build for the product video

Branch `demo/video-2026-11-04`, release `v1.1.0-beta.26-demo`. Never merged into `main` (ADR 0038).
The recording script (what to click, what to say, the titles for iMovie) is the Word file Jonas got with this build.

## What is fake, what is real

| Part | In the demo | Where |
|---|---|---|
| Student | Maya Chen, UC Berkeley, signed in with a fake Google account | `frontend/demo/demo-data.js` |
| bCourses (Canvas) | Fake Canvas REST API: 4 courses, 8 assignments, due dates relative to today | `demo-data.js` (`canvasApi`), `demo-ui.js` (Connect Canvas) |
| Google Calendar | 4 fake calendars, a full week of classes, gym, club, family | `demo-data.js` (`googleEvents`), `demo-api.js` |
| AI chat | Scripted answers in the shape of `/api/chat` (same every take) | `frontend/demo/demo-chat.js` |
| Focus history | Two weeks of sessions for the Data page | `demo-data.js` (`sessions`, `usage`) |
| Blocking | **Real** (desktop app): YouTube, Instagram, TikTok, Reddit, Netflix; 10 s to switch back | `app/desktop/blocker.js` |
| Phone calls | **Real**, through the Concentr8 server, with your own number | `demo-api.js` (`REAL_ROUTES`), `demo-ui.js` |

Everything is relative to the moment of recording: "due tomorrow" is always tomorrow, the focus block of scene 3 is
always "now", and a class at that time is left out of the calendar.

## Scenes (Demo menu in the desktop app, or Ctrl+Alt+1…5 in a browser)

| # | Title in the video | Starts on | State |
|---|---|---|---|
| 1 | Your semester, synced | Courses | bCourses not connected yet; Google Calendar connected |
| 2 | From overwhelm to a plan | Home | Assignments imported, empty chat |
| 3 | Distractions, blocked | Calendar | A focus block for Project 3 right now |
| 4 | When you're stuck, Concentr8 calls | Focus | Focus session on Project 3 running for 6 minutes |
| 5 | Progress you can see | Data | Like 3, plus today's finished session |

Demo menu, "Reset demo data" goes back to scene 1. Your real call setup is kept across scenes.

## Real calls: set up once
1. Profile, Phone call, "Connect real calls with Google": sign in in the browser with the Google account you use in
   Concentr8. If that account has your number, calls are ready.
2. Otherwise enter your number on the same page, tick the box, Save.
3. Profile, Demo setup (Demo menu) shows whether the server has the stuck-call agent. Without it, "I'm stuck · call me"
   places the normal planning call, and the task you say on the phone becomes the first step.

After a call the app asks the server every 3 seconds (`GET /api/today`, up to 8 minutes) and shows the result:
- stuck call: the first step goes on top of the task, the timer shows 5 minutes, the window comes to the front;
- planning call ("Call me now"): a block in the calendar and a line in the chat.

## Tests
- `npm test` in `app/`: desktop tests plus `app/test/demo.test.js` and `frontend/demo/test/demo.test.js`
  (mock data valid for app-state.js, scripted chat, fake backend, real-token routing).
- CI (`.github/workflows/app-demo.yml`): unit tests, call server tests, an Electron smoke test on Linux, the Mac build
  and a smoke test of the built Mac app (`app/desktop/demo-smoke.js`), then the release.
