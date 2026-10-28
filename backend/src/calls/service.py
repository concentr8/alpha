"""Business rules of the call feature.

Purpose:  the "brain": checks the rules, stores schedules, asks Claude for a
          script and asks the voice provider to place the call.
Called by: router.py (from the web). Later also scheduler.py (see its TODOs).
Calls:     store.py, phone.py, providers/registry.py, providers/llm_claude.py

The rules this file enforces (docs/plans/call-feature.md, section Risks):
  1. No schedule without explicit consent.            -> create_schedule
  2. Stopping always works, and keeps the consent record. -> delete_schedule
  3. Calls only inside the allowed hours, in the user's own time zone.
                                                        -> place_call_now
  4. The call says who is calling and that it is an AI voice. The words come
     from providers/llm_claude.py; tests/test_calls_service.py checks them.
  5. Phone numbers are never logged in full.           -> mask_phone

Errors are plain exception classes. router.py turns each one into an HTTP
status, so nothing in this file knows about the web.
"""

import logging
from datetime import datetime, time, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from src.calls.phone import mask_phone
from src.calls.schemas import CallLogEntry, CallSchedule, CallScheduleCreate
from src.calls.store import store
from src.providers import llm_claude
from src.providers.base import VoiceProvider
from src.providers.registry import get_provider

logger = logging.getLogger(__name__)

# Calls are only placed from 08:00 up to (not including) 21:00 local time.
# This is a careful default, not legal advice. TODO: confirm the exact hours
# with a lawyer before real users are called (see the plan, section Risks).
ALLOWED_FROM = time(8, 0)
ALLOWED_UNTIL = time(21, 0)


class ConsentMissing(Exception):
    """Someone tried to schedule calls without the user's consent."""


class InvalidTimezone(Exception):
    """The time zone is not a real IANA name like "America/Los_Angeles"."""


class ScheduleNotFound(Exception):
    """There is no schedule with this id."""


class ScheduleInactive(Exception):
    """The schedule was stopped by the user, so it must not call anymore."""


class OutsideAllowedHours(Exception):
    """It is too early or too late in the user's own time zone."""


def create_schedule(data: CallScheduleCreate) -> CallSchedule:
    # Rule 1 comes first, before anything is checked or stored.
    if not data.consent_to_calls:
        raise ConsentMissing("The user must agree to be called.")
    _check_timezone(data.timezone)

    schedule = CallSchedule(
        **data.model_dump(),
        id=str(uuid4()),
        consent_at=datetime.now(timezone.utc),
    )
    store.save(schedule)
    logger.info("schedule %s created for %s", schedule.id, mask_phone(schedule.phone_e164))
    return schedule


def delete_schedule(schedule_id: str) -> None:
    """Stop all future calls. Doing it twice is fine."""
    schedule = _get_schedule(schedule_id)
    # We keep the record and only switch it off: the consent time stays as proof.
    store.save(schedule.model_copy(update={"active": False}))
    logger.info("schedule %s stopped", schedule_id)


async def place_call_now(
    schedule_id: str,
    *,
    provider: VoiceProvider | None = None,
    now: datetime | None = None,
) -> dict[str, str]:
    """Place one call right now and remember its status.

    `provider` and `now` exist for tests: a test passes the fake provider and a
    fixed time. A real run leaves both empty (provider from the settings, time
    from the clock). Passing the provider explicitly also means a test can never
    start a real call, even if someone put VOICE_PROVIDER=dial into .env.
    """
    schedule = _get_schedule(schedule_id)
    if not schedule.active:
        raise ScheduleInactive("This schedule was stopped.")

    now = now or datetime.now(timezone.utc)
    if not _is_allowed_hour(now, schedule.timezone):
        raise OutsideAllowedHours(
            f"Calls are only placed from {ALLOWED_FROM:%H:%M} to {ALLOWED_UNTIL:%H:%M} "
            "in the user's own time zone."
        )

    script = await llm_claude.write_call_script(schedule.task_title)
    provider = provider or get_provider()
    result = await provider.start_call(schedule.phone_e164, script)

    # Only the status is stored: never the script text, never the number.
    store.add_call(
        CallLogEntry(
            schedule_id=schedule.id,
            provider_call_id=result.provider_call_id,
            status=result.status,
            placed_at=now,
        )
    )
    logger.info("call to %s: %s", mask_phone(schedule.phone_e164), result.status)
    return {"provider_call_id": result.provider_call_id, "status": result.status}


def _get_schedule(schedule_id: str) -> CallSchedule:
    schedule = store.get(schedule_id)
    if schedule is None:
        raise ScheduleNotFound(f"No schedule with id {schedule_id}.")
    return schedule


def _check_timezone(name: str) -> None:
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        raise InvalidTimezone(f"Unknown time zone: {name!r}") from None


def _is_allowed_hour(now: datetime, timezone_name: str) -> bool:
    """Is `now` (any time zone) between ALLOWED_FROM and ALLOWED_UNTIL for the user?"""
    local_time = now.astimezone(ZoneInfo(timezone_name)).time()
    return ALLOWED_FROM <= local_time < ALLOWED_UNTIL
