# 0031. The chat asks first and every task gets a time estimate

Status: Accepted (Jonas, 2026-11-03). Plan: `docs/plans/chat-interview-and-google-login.md`. Source: Linear CON-53 items 1, 10, 11 and CON-35.
Purpose: explains the chat prompt change to server maintainers.

Before, the prompt said "suggest one small first step", so the chat jumped to the timer. Now the chat first understands
what the student wants to get done, asks 1 to 2 short questions in total (one per reply), and only then proposes a
small plan with focus sessions. The timer card is offered after the student agreed to a plan or asked for it.

Every task gets a time estimate first. The chat suggests the obvious times itself and the student confirms or changes
them. `add_todo` and `suggest_todo` get an optional whole number `minutes` (1 to 480). `add_todo` asks for it in its
schema; the server still accepts the action without it, because a wrong or missing number must never cost the student
the task. `cleanActions` drops only the bad number.

No new server state: the app already sends the last messages, so the interview lives in that history.

Not done here: the app saving `minutes` as `estimatedMinutes` and showing it (TODO: Jack decides where, CON-35) and the
due date, which belongs to `docs/plans/chat-followups.md` step 1.
