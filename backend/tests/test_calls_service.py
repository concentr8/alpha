"""Tests for the rules of the call feature (src/calls/service.py).

Purpose:  proves the rules in docs/plans/call-feature.md: consent, time zone,
          stop, allowed hours, and that no phone number reaches the logs.
          They use the fake provider only, so no real call is ever placed.
Run:      cd backend && pytest
"""

import asyncio
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from src.calls import service
from src.calls.phone import mask_phone
from src.calls.schemas import CallScheduleCreate
from src.calls.store import store
from src.providers import llm_claude
from src.providers.base import MockProvider

FAKE_NUMBER = "+15555550100"  # fake number, see AGENTS.md


def setup_function() -> None:
    """pytest runs this before every test, so each test starts with nothing stored."""
    store.clear()


def make_request(**changes) -> CallScheduleCreate:
    """A valid request; each test changes only what it wants to test."""
    values = {
        "user_id": "u1",
        "phone_e164": FAKE_NUMBER,
        "timezone": "America/Los_Angeles",
        "local_time": "08:00",
        "weekdays": [0, 1, 2],
        "task_title": "Essay outline",
        "consent_to_calls": True,
    }
    values.update(changes)
    return CallScheduleCreate(**values)


def utc(hour: int, minute: int = 0) -> datetime:
    """A moment on 2026-10-23 (Los Angeles is then UTC-7, New York UTC-4)."""
    return datetime(2026, 10, 23, hour, minute, tzinfo=timezone.utc)


def place_call(schedule_id: str, now: datetime) -> dict[str, str]:
    return asyncio.run(service.place_call_now(schedule_id, provider=MockProvider(), now=now))


# --- creating a schedule -----------------------------------------------------


def test_create_schedule_stores_it_and_remembers_when_consent_was_given() -> None:
    schedule = service.create_schedule(make_request())

    assert store.get(schedule.id) == schedule
    assert schedule.active is True
    assert schedule.consent_at.tzinfo is not None  # stored in UTC


def test_create_without_consent_is_refused_and_nothing_is_stored() -> None:
    with pytest.raises(service.ConsentMissing):
        service.create_schedule(make_request(consent_to_calls=False))

    assert store.count_schedules() == 0


def test_unknown_time_zone_is_refused() -> None:
    with pytest.raises(service.InvalidTimezone):
        service.create_schedule(make_request(timezone="Mars/Olympus"))


def test_weekday_outside_0_to_6_is_refused_by_the_data_shape() -> None:
    with pytest.raises(ValidationError):
        make_request(weekdays=[7])


# --- stopping ----------------------------------------------------------------


def test_stop_switches_the_schedule_off_but_keeps_the_consent_record() -> None:
    schedule = service.create_schedule(make_request())

    service.delete_schedule(schedule.id)

    stopped = store.get(schedule.id)
    assert stopped.active is False
    assert stopped.consent_at == schedule.consent_at


def test_stopping_twice_is_fine() -> None:
    schedule = service.create_schedule(make_request())
    service.delete_schedule(schedule.id)
    service.delete_schedule(schedule.id)


def test_stopping_an_unknown_schedule_says_so() -> None:
    with pytest.raises(service.ScheduleNotFound):
        service.delete_schedule("does-not-exist")


# --- placing a call ----------------------------------------------------------


def test_call_inside_allowed_hours_is_placed_and_only_the_status_is_stored() -> None:
    schedule = service.create_schedule(make_request())

    result = place_call(schedule.id, now=utc(17))  # 10:00 in Los Angeles

    assert result["status"] == "queued"
    [entry] = store.calls_for(schedule.id)
    assert entry.status == "queued"
    assert FAKE_NUMBER not in entry.model_dump_json()


def test_call_before_8_in_the_morning_local_time_is_refused() -> None:
    schedule = service.create_schedule(make_request())

    with pytest.raises(service.OutsideAllowedHours):
        place_call(schedule.id, now=utc(14, 30))  # 07:30 in Los Angeles

    assert store.calls_for(schedule.id) == []


def test_call_at_9_in_the_evening_local_time_is_refused() -> None:
    schedule = service.create_schedule(make_request())

    with pytest.raises(service.OutsideAllowedHours):
        place_call(schedule.id, now=utc(4))  # 21:00 in Los Angeles (on the next UTC day)


def test_allowed_hours_use_the_users_own_time_zone() -> None:
    # The same moment (14:30 UTC) is 07:30 in Los Angeles but 10:30 in New York.
    los_angeles = service.create_schedule(make_request(timezone="America/Los_Angeles"))
    new_york = service.create_schedule(make_request(timezone="America/New_York"))

    with pytest.raises(service.OutsideAllowedHours):
        place_call(los_angeles.id, now=utc(14, 30))
    assert place_call(new_york.id, now=utc(14, 30))["status"] == "queued"


def test_a_stopped_schedule_never_calls() -> None:
    schedule = service.create_schedule(make_request())
    service.delete_schedule(schedule.id)

    with pytest.raises(service.ScheduleInactive):
        place_call(schedule.id, now=utc(17))


def test_call_for_an_unknown_schedule_says_so() -> None:
    with pytest.raises(service.ScheduleNotFound):
        place_call("does-not-exist", now=utc(17))


# --- what the call says and what is logged -----------------------------------


def test_the_call_script_names_articul8_and_says_it_is_an_ai() -> None:
    script = asyncio.run(llm_claude.write_call_script("Essay outline"))

    assert "Articul8" in script
    assert "AI" in script
    assert "Essay outline" in script


def test_phone_numbers_are_masked_for_logs() -> None:
    assert mask_phone(FAKE_NUMBER) == "+*********00"
    assert "5555" not in mask_phone(FAKE_NUMBER)
