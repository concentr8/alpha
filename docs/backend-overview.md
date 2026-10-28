# Backend in one page

For people who do not write Python. Details per file: docs/architecture.md.

## What the backend is for
Later: call a student at the study time they chose and help them start with
one small step. Today only the groundwork exists. The frontend does not talk
to the backend yet.

## What works today
| Part | Status |
|---|---|
| Save a call schedule (needs consent, real time zone, weekdays 0-6) | Works, kept in memory |
| Stop a schedule (consent time is kept as proof) | Works |
| "Call me now" test, with a fake provider | Works, no real call |
| Only call between 08:00 and 21:00 in the user's own time zone | Works |
| Phone numbers never appear in full in logs | Works |
| Real calls (ElevenLabs or Dial) | Not built |
| Claude writes the call script | Fixed text for now |
| Calls at the planned time (scheduler) | Not built |
| Database | Not built, data is lost when the server restarts |

## How one request travels
    Browser or /docs page
       -> router.py     turns the web request into a function call
       -> service.py    checks the rules (consent, hours, stopped?)
       -> store.py      remembers schedules and call status (memory)
       -> llm_claude.py writes what the voice says
       -> provider      places the call (fake for now)

Each file starts with a header: what it is for, who calls it, what it calls.
Rules live only in `service.py`. `router.py` only translates, so it stays short.

## Where to look when you want to change something
| I want to... | Open |
|---|---|
| change the allowed calling hours | `backend/src/calls/service.py` (`ALLOWED_FROM`, `ALLOWED_UNTIL`) |
| add a field to a schedule | `backend/src/calls/schemas.py` |
| change what the voice says | `backend/src/providers/llm_claude.py` |
| add a new voice provider | new file in `backend/src/providers/`, then `registry.py` |
| change where data is stored | `backend/src/calls/store.py` only |

## Try it
    cd backend
    python -m venv .venv && source .venv/bin/activate
    pip install -r requirements.txt
    pytest                          # all tests, no real call
    uvicorn src.main:app --reload   # then open http://localhost:8000/docs

On the /docs page you can click through every address. Use fake numbers like
`+15555550100`. `VOICE_PROVIDER` stays `mock` until real calls are built.
