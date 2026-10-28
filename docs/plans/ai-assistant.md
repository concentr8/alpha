# Plan: Connect the AI assistant to a language model

Status: DRAFT, waiting for a human "go" (AGENTS.md). No code yet.
Facts marked VERIFIED were read on official pages on 2026-10-23; UNVERIFIED
means estimate or not checked.

## What
The round "AI" button in frontend/index.html opens the Articul8 agent panel
(`#agent`, composer `textarea`, voice input). Today `store.send(text)` only
stores the user's message in the browser: nobody answers. This plan adds a
backend endpoint `POST /assistant/chat` that asks an LLM and returns a short
reply. Voice stays as it is: input via `/voice/transcribe`, output via
`/voice/speak` (docs/plans/voice-and-sound.md).

## Why
The assistant is the core promise for students with ADHD: help to start
("what is the first small step?"), not long advice. Without an answer the
panel feels broken in the customer interviews.

## Model and provider
- Provider: Anthropic API. `ANTHROPIC_API_KEY` is already planned for
  src/providers/llm_claude.py; one account, one key.
- Recommended: `claude-haiku-5-5` (VERIFIED id and price). Short answers,
  low latency, about 20x cheaper than Sonnet. Fallback if quality is too low:
  `claude-sonnet-5-5` (VERIFIED id). Model name is a setting, not hard-coded.
- Call with `httpx` (already used by src/voice), so no new dependency.
- Haiku 5.5 uses adaptive thinking, default effort `medium` (VERIFIED). Thinking
  tokens are billed as output. We want it off or `low`; exact request field
  UNVERIFIED, check in the API docs before coding.

## Cost per conversation
Prices per million tokens (VERIFIED, platform.claude.com pricing page):
Haiku 5.5 $0.10 in / $0.50 out (prompt up to 100k tokens); Sonnet 5.5 $2 in /
$10 out. Voice (ElevenLabs pricing page, read through a summarising fetch, so
treat as UNVERIFIED): TTS Multilingual v2 $0.08 per 1k characters, Flash
$0.04 per 1k, Scribe v2 $0.22 per hour.

Assumption (UNVERIFIED, ours): 10 turns, system prompt + context 600 tokens,
history grows by about 90 tokens per turn, each reply about 60 tokens, no
prompt caching. Total about 10,000 input and 600 output tokens.

| Part | Haiku 5.5 | Sonnet 5.5 |
|---|---|---|
| Text (LLM) | about $0.0013 | about $0.026 |
| Spoken replies (about 2,400 characters, Multilingual v2) | about $0.19 | about $0.19 |
| Spoken replies with Flash | about $0.10 | about $0.10 |
| Voice input (about 100 s of speech) | about $0.006 | about $0.006 |

Consequence: the LLM is almost free; the voice output costs 100x more than
the text. The cost lever is shorter replies and a cheaper TTS model, not the LLM.
Creator plan included credits: UNVERIFIED (page unclear). Anthropic org spend
limit can be set lower in the Console as a hard stop (VERIFIED it exists).

## System prompt (draft, in English; the user's language is mirrored)
    You are Articul8, an AI study coach for students with ADHD. Say you are an AI
    if asked.
    Rules: answer in at most 3 short sentences (under 60 words). One next step
    only, small enough to start in 2 minutes. No lists, no headings, no
    lecturing. Plain words. Warm, never guilt. If the student is stuck or
    overwhelmed, shrink the step. If asked something off-topic, answer in one
    sentence and return to the task. You are not a therapist or doctor; for
    crisis or health topics, suggest a real person and local help.
    Context (may be empty): current task: {task_title}.
The prompt lives in backend/src/assistant/prompt.py so it is easy to review.
Request limits: `max_tokens` 300 (a hard ceiling on output cost).

## Rate limits (like ADR 0011)
ADR 0011 and src/voice/limits.py are in open PR #11, not yet on main. This plan
depends on that PR being merged first, then reuses the same idea:
- per visitor per hour: ASSISTANT_REQUESTS_PER_VISITOR_PER_HOUR (default 30, guess)
- daily budget for the whole app: ASSISTANT_TOKENS_PER_DAY (default 500,000, guess)
- 429 with a plain message; the page shows nothing special and keeps working
- input caps: last 10 messages, 2,000 characters each (the frontend already cuts at 2,000)
Same weakness as ADR 0011: counters in memory, visitor from X-Forwarded-For
can be faked, the daily budget is the real cap. Needs its own ADR (0014).

## Secrets and settings
- `ANTHROPIC_API_KEY` (exists in .env.example; value only in backend/.env, never
  in chat or git).
- New non-secret setting `ASSISTANT_MODEL=claude-haiku-5-5` (commented line in
  .env.example, same style as the ElevenLabs model lines) plus the two limit names.

## Privacy and consent
- The student's messages, and the title of the selected task, go to Anthropic
  through our backend. Say so in the consent text before the first message
  (same notice as for ElevenLabs, ADR 0013 TODO). Anthropic data-retention and
  training terms for API use: UNVERIFIED, read before launch.
- Backend stores nothing: the browser sends the last messages each time. Logs
  hold status and token counts only, never message text.
- No phone numbers, names or calendar data in the prompt. Only task title.
- Do not send anything on `?api=off`.

## How the frontend hooks in (fewest changes)
Frontend is frozen (ADR 0001); each hook needs Jack's OK and an ADR.
Read from the file today: user messages are stored by `store.send()`; the chat
list is drawn by `renderMessages()`; the panel submit calls `store.send(text)`.
1. New self-contained block `assistant.js` next to `elevenlabs.js`, reusing
   `DEFAULT_API` and the `?api=off` switch. It posts to `/assistant/chat` and
   stores the answer in `store.state.messages` with `reply:true`.
2. Hook A, one line in the panel submit handler: `window.Articul8Assistant?.ask(text)`
   after `store.send(text)`. NOT in the toolbox task form (it also calls `send`).
3. Hook B, in `renderMessages()`: a reply is drawn as a bubble without the
   "+ To-do / Tools" buttons. Existing `.chat-message p` style, no new colours;
   left alignment instead of right uses an existing rule (docs/design.md).
4. Hook C (optional): when voice is on, speak the reply with the existing
   `/voice/speak` path. Replies are under 2,000 characters (MAX_TEXT_CHARS).
5. If the backend is unreachable or limited: no reply, panel works as today.
TODO: check that saved state (localStorage) keeps the `reply` field and that
`CalendarUI.interpret` (local calendar phrases) still runs first.

## Files touched
New: backend/src/assistant/{__init__,router,service,prompt}.py,
backend/tests/test_assistant_*.py (fake LLM, no network, no key).
Changed: backend/src/main.py (plug router), backend/src/config.py (3 settings),
.env.example, docs/architecture.md, frontend/index.html (3 hooks, after "go"),
docs/decisions/0014 (new ADR). src/providers/llm_claude.py keeps the call
script; both can share one small `ask_claude()` helper (TODO decide).

## Risks
- Voice output cost dominates; public link plus Heroku means anyone can spend
  credits. Limits are in memory and reset on restart.
- Prompt injection or off-topic use by visitors: short `max_tokens` and the
  daily budget cap damage; no tools, no stored data, so little to leak.
- Answer quality for ADHD students is untested: needs a 10-question manual test
  set before launch.
- Health topics: the assistant is not a therapist; wording in the prompt, plus
  a visible AI notice.
- Model and price names change; they are read from settings, prices re-checked
  before launch.

## Open questions for Jonas
1. Model: Haiku 5.5 (cheap) or Sonnet 5.5 (better quality, 20x text cost)?
2. Spoken replies: always, only when the user used voice, or off by default?
   TTS model: Multilingual v2 (nicer) or Flash (half price)?
3. Daily budget in euros you accept (sets the two limit numbers)?
4. Answer language: mirror the user (default) or always English?
5. Consent: one-time notice text before the first message, who writes it?
6. Should the assistant know the task title (better help, more data shared)?
7. Keep chat history only in the browser (plan) or store it later (needs accounts)?
