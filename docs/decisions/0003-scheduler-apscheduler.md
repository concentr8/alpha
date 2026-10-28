# 0003. Scheduler: APScheduler inside the app

Status: Proposed
Date: 2026-10-20
Deciders: Jonas (to confirm), team

## Context
Calls must fire at each user's local time. A small app does not need a
separate job-queue server yet.

## Decision
Start with APScheduler running inside the backend, with jobs saved in the
database so they survive a restart.

## Consequences
- Good: no extra servers, supports time zones and cron-style times.
- Harder: runs in one process only and has basic error handling. If we need
  several servers or guaranteed retries, we move to a job queue (e.g. Celery)
  and write a new ADR.
