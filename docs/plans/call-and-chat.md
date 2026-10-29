# Plan: Phone call setup and AI chat in the app

Status: Approved by Jonas on 2026-10-28 ("lass das jetzt mal bauen"). Built the same day.
Goal: a stable version where the student can set up the daily phone call and chat with Claude inside the app.

## What the student sees
1. Profile, Phone call (new page): phone number, time of the call, a consent box, Save, "Call me now",
   "Delete my account". Save creates the account on the server (`/api/register`) and keeps the token in the browser.
2. The AI chat (round "AI" button and the Home composer): every message gets a short answer from Claude.
   Without an account the answer says to set up the phone call first.
3. Privacy page: says what is sent where.

## How it works
- `frontend/concentr8-server.js` talks to the server at `https://concentr8-api-....azurewebsites.net`
  (web app, desktop app and server are three addresses; the page has no build step, so the address is one constant).
- Chat: the app sends the last 12 messages and the titles of open tasks to `POST /api/chat`. The server asks Claude
  (model from `ANTHROPIC_MODEL`), keeps no history, and allows 100 chats per student per day (`CHAT_PER_DAY`).
- Calls: Save sends number, time and time zone; the open task titles go to `/api/tasks` before every save and
  "Call me now", so the call knows what is due. The call itself is the existing Cartesia flow.
- `frontend/index.html` gets small edits (listed in ADR 0022): a script tag, the Phone call menu entry, a `role`
  field on messages so answers can be told from the student's own, two calls to `Concentr8.ask()`.

## Not in this step
- Voice answers in the chat (text only), Canvas/bCourses, Google Calendar, blocking, "I'm stuck".
- Tasks with due dates: the app's tasks have no due date field, so calls list titles only. TODO.
- Closing the server to strangers is done with the existing server settings, no code: `OPEN_SIGNUPS=false` and a
  `REGISTER_CODE` (Jonas's choice, 2026-10-28). The Phone call page then shows the field "Invite or recovery code"
  (it asks the server's `/api/health`), and the call and chat work as soon as a valid code was entered once.

## Risks
- Each chat costs Claude money (small with Haiku, about 20x more with Sonnet; docs/plans/ai-assistant.md has numbers).
  The daily cap per student is the brake.
- A phone number can be registered by anyone while sign-ups are open; an existing number needs the recovery code.
