# 0008. Phase 1 of the call feature: memory store and calling hours

Status: Proposed (accepted when the pull request is merged)
Date: 2026-10-23
Deciders: Jonas

## Context
Phase 1 of docs/plans/call-feature.md needs schedules to be saved, stopped and
tested with a fake provider. Hosting and database are not decided (plan,
decision 4). The plan also asks for calls only inside allowed hours.

## Decision
- Schedules and call results are kept in memory (`calls/store.py`). All other
  code only talks to that class, so the real database replaces its inside later.
- Stopping a schedule switches it off and keeps the record, because the time
  of consent is our proof that the user agreed.
- Calls are placed only from 08:00 up to 21:00 in the user's own time zone
  (`ALLOWED_FROM`, `ALLOWED_UNTIL` in `calls/service.py`). This is a careful
  default, not legal advice.
- `service.place_call_now` can take the provider and the time as parameters, so
  tests use the fake provider and a fixed time and can never start a real call.
- Users are in the USA (told by Jonas on 2026-10-23); EU rules are out of scope.

## Consequences
- Good: the rules are testable now, without a database or a phone provider.
- Harder: data is lost when the server restarts. Not usable for real users.
- TODO: Python's time zone data (`zoneinfo`) needs the operating system's time
  zone files. Small server images (and Windows) may lack them. If so, add the
  `tzdata` package to requirements.txt (ask first, see AGENTS.md).
- TODO: have a lawyer confirm the calling hours before real users are called.
