# Plan: chat asks first, time estimates, Google sign-in (Linear CON-53, Jonas' backend items)

Status: APPROVED by Jonas on 2026-11-03 (answers below). Code follows in two pull requests.
Source: Linear CON-53 "Jack's feedback on MVP interaction flow", backend items 1, 7, 10, 11 (and CON-35).
UNVERIFIED means not checked yet.

## 1 + 10. The chat asks before it plans (items 1 and 10)
**Today:** `CHAT_SYSTEM_PROMPT` in `server/index.js` says "suggest one small first step", "at most one question" and
mentions the timer first. So the chat jumps to the timer.
**Plan:**
- Rewrite the prompt: first understand what the student wants to get done. Ask 1 to 2 short questions (what exactly,
  by when, how big), one at a time. Only then propose a small plan with focus sessions.
- `open_tool: timer` only after the plan, or when the student asks for it. No timer as the first reply.
- A to-do is "complete" when it has a title and a time estimate (the due date comes with `chat-followups.md` step 1). `add_todo` is used only then; until then
  the model keeps asking (1 to 2 questions, then it uses what it has).
- No new server state: the app already sends the last 12 messages, so the interview lives in that history.
- Tests (`server/test/chat-actions.test.js` plus a prompt test): the prompt contains the ask-first rule; `cleanActions`
  still drops bad calls.

## 11. Estimate time first (item 11, CON-35)
**Today:** tasks have no estimate from the chat. The calendar already knows `estimatedMinutes` on a task.
**Plan:**
- Add `minutes` (whole number, 1 to 480) to the tools `add_todo` and `suggest_todo`. `cleanActions` drops a wrong
  `minutes` and keeps the action.
- The prompt says: right after the student lists tasks, say "First, let's figure out how long each one takes", suggest
  the obvious ones (appointment = about 5 minutes) and let the student confirm or change them.
- The app saves `minutes` as `estimatedMinutes` of the task. TODO (Jack, CON-35 open question): where the time is shown
  (to-do, calendar, both). The server part works without it.

## 7. Sign in with Google, no phone number (item 7)
**Today:** `/api/register` needs a phone number plus consent (`server/index.js`). Google OAuth exists only to read
the calendar (ADR 0030, `server/google-calendar.js`).
**Plan:**
- New sign-in: "Sign in with Google" (scopes `openid email` only, PKCE, state, same safety rules as ADR 0030).
  The server accepts the account only if Google says the email is verified. The account is found by the Google account id (`sub`), because an email can change; the email is kept up to date.
  It gets the same Bearer token as today, so every other route stays unchanged.
- The phone number becomes optional and is only needed for calls (level 2 in `chat-followups.md`). Consent for calls
  is asked when the student adds a number, not at sign-in.
- Old accounts (phone only) are not linked (decision 2). New students sign in with Google only.
- New ADR that supersedes the phone sign-up part of ADR 0022. Guest chat stays as is.
- Tests: mocked Google, wrong state, unverified email, same email twice gives the same account, no email in logs.
- Human steps (not code): in the Google Cloud project add a second redirect URI (`/auth/google/callback`) and keep
  the consent screen on `openid email`.

## Decisions (Jonas, 2026-11-03)
1. Any Google account, school accounts too. Sign-in asks only for `openid email`. Calendar access is always a separate
   opt-in the student chooses (existing Google Calendar dialog, ADR 0030); sign-in never grants it.
2. Old phone-only accounts are not linked: everyone starts fresh with Google. No "Link Google".
3. The chat asks 1 to 2 questions to gather what it needs, then proposes a plan with focus sessions.

## Steps (after the go, one pull request each)
1. Prompt and `minutes` in the tools (items 1, 10, 11), tests.
2. Google sign-in on the server (item 7), ADR, tests.
3. Frontend wiring (Sign-in button, show the estimate): needs Jack and a plan edit, because `frontend/index.html` is frozen.

## Risks
- A chat that asks too much annoys students with ADHD: limit of 1 to 2 questions.
- Email is personal data: stored only on the account record, never logged.
