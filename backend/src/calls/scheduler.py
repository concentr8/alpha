"""Runs jobs at the planned times.

Purpose:  wakes up at each user's chosen local time and tells service.py to
          place the call.
Status:   NOT BUILT YET (phase 3 of docs/plans/call-feature.md). Nothing calls
          this file today; main.py does not start a scheduler.
Planned:  main.py starts it at app startup; service.py adds and removes jobs.
Why APScheduler: it runs inside our own app, needs no extra server, and
          supports time zones and saving jobs in a database. If we later need
          several servers or guaranteed retries, we move to a job queue
          (see ADR 0003, status Proposed).
"""

# TODO: from apscheduler.schedulers.asyncio import AsyncIOScheduler
# TODO: create ONE scheduler, use a database job store so jobs survive a restart.
# TODO: add_job(place_call_now, trigger=CronTrigger(hour=..., minute=...,
#                                                   day_of_week=..., timezone=user_tz))
# TODO: handle "no answer": retry rules (how many times, how long apart).
