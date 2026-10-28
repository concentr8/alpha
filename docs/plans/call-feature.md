# Plan: Call feature

Status: Phases 0 and 1 approved by Jonas on 2026-10-23 and built. Real calls
(phase 2 onwards) are not built yet.

## Goal
A user says "I want to study at these times". At those times Articul8 calls
them and helps them start with one small step.

## Target flow
Frontend (later) -> POST /calls/schedules -> store schedule + consent
-> scheduler job at the user's local time -> Claude writes a short script
-> provider places the call -> store call status.

## Decisions needed from Jonas
1. **Voice provider.** Jonas leans towards ElevenLabs (2026-10-23), not final until
   the test call in phase 2. Dial alone, or ElevenLabs + Twilio?
   - Dial (getdial.ai): phone numbers and voice calls for AI agents, with a
     Python SDK (`dial-sdk`). Per secondary sources it offers a managed mode and a
     self-hosted mode where our own model (e.g. Claude) drives the call.
     Prices quoted there: from $0.13/min (self-hosted), $0.22/min (managed).
     TODO: confirm on docs.getdial.ai.
   - ElevenLabs: outbound calls through a Twilio number. Their guide uses a
     Node server between Twilio and the agent. TODO: check whether a direct API
     endpoint removes the need for that server.
   - Suggested way to decide: one real test call to your own phone per option
     (phase 2), then compare voice quality, delay, price, setup effort.
2. **Backend language.** Python with FastAPI is what the scaffold assumes (ADR 0002).
3. **Frontend.** It has no field for phone number, times or consent. Because it
   is frozen, we first test the API directly (Swagger page at /docs). How the
   UI gets these fields is a separate decision.
4. **Hosting and database.** Open. SQLite is only a placeholder.
5. **Where do users live?** Decided 2026-10-23: USA. EU/Germany is out of scope.

## Risks
- **Consent and AI voice.** In the US, the FCC treats AI-generated voices as
  an "artificial or prerecorded voice" under the TCPA. Non-marketing calls to
  cell phones generally need prior express consent; the caller must identify
  itself and explain how to opt out. Source is US only. EU/Germany not
  researched. Get legal advice before real users are called.
- **Time zones.** Store the user's IANA time zone; "08:00" must stay 08:00
  across daylight saving changes.
- **No answer.** Limit retries; never call repeatedly.
- **Cost.** Calls are billed per minute. Add a daily limit per user.
- **Secrets and personal data.** Keys only in backend/.env. Phone numbers are
  personal data: no full numbers in logs.

## Phases
0. Skeleton with placeholders (done).
1. Fake provider + tests for schedule rules (consent, time zone, delete). Done
   in memory, see ADR 0008. Tests written; CI runs them on the pull request.
2. Spike: one real test call to your own number per provider.
3. Scheduler with saved jobs.
4. Claude writes the script.
5. Connect the frontend (own decision, own ADR).

## Done when
A saved schedule makes a real call at the right local time, the call names
Articul8 and says it is an AI, the user can stop it, and tests cover consent,
time zone and stop.
