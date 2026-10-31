# Plan: AI chat without login (12 messages per day)

Status: ACCEPTED. Jonas answered the decisions on 2026-10-30 (below). Built step by step.

## Goal
A visitor can try the AI chat (round "AI" button, Home composer) for 12 messages per day without signing up.
After that the chat asks them to sign in under Profile, Phone call.

## What exists today (read from the code, 2026-10-30)
- `frontend/concentr8-server.js` `ask()`: without a token it answers "set up the phone call first" and never calls the server.
- `POST /api/chat` needs a student token, allows `CHAT_PER_DAY` (100) per student per day, asks Claude (model from
  `ANTHROPIC_MODEL`; the live server reports `claude-sonnet-5-5`, 2026-10-30), keeps no history.
- Every chat costs Claude money (docs/plans/ai-assistant.md). Without a login, anyone on the internet could spend it.

## Design
- The browser makes a random guest id once (128 bit, `localStorage`). No phone number, no account.
- New route `POST /api/chat/guest` with `{guestId, messages, tasks}`. Same Claude call and same answer shape as `/api/chat`.
- Three server-side limits (a counter only in the browser could be skipped by anyone):
  1. per guest id: `GUEST_CHAT_PER_DAY` messages per day (default 12, the day is the UTC day: a guest has no time zone);
  2. per IP address: `GUEST_CHAT_PER_IP_PER_DAY` (default 30), held in memory, the IP itself is not saved;
  3. all guests together: `GUEST_CHAT_GLOBAL_PER_DAY` (default 200), the brake for the bill.
- The guest id is stored as a hash with its counter in the data file (same file as the students).
- App: without a token `ask()` uses the guest route. At message 10 the answer ends with "2 free messages left today". At the
  limit the assistant says: "You used your 12 free messages for today. Sign in under Profile, Phone call to keep chatting."
  A server answer 429 shows the same kind of text.
- The privacy text (index.html, Profile, Privacy) says that guest messages and open task titles go to the server
  and to Claude, like for students (ADR 0022, point 6).
- Files: `server/index.js`, `server/test/`, `frontend/concentr8-server.js`, the privacy text in `frontend/index.html`
  (small, text only). New secrets: none. New settings go into `.env.example`. `docs/architecture.md` updated.

## Decisions (Jonas, 2026-10-30)
1. 12 messages per day per visitor, without login (not a total).
2. Limits per IP (30 per day) and for all guests together (200 per day): fine as defaults.

## Risks
- Someone clears `localStorage` for a new guest id: stopped by the per-IP and the global limit, not by the per-id limit.
- Behind Azure the real IP comes in a forwarded header. TODO: check how App Service sends it before trusting it.
- Tasks titles of a guest are private data: nothing is logged (AGENTS.md).

## Steps (after the go)
1. Server: guest route, limits, tests (limit reached, per IP, global, bad id, no key).
2. App: `ask()` uses the guest route, messages, privacy text.
3. Check with the live server and a fresh browser profile.
Each step is its own pull request.

## Done when
A fresh browser without account gets answers for 12 messages a day, the 13th shows the sign-in text, and the three limits
are covered by tests.
