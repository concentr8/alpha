"""Data shapes of the call feature (what the API accepts and returns).

Purpose:  describes what a "call schedule" and a "call log entry" are. FastAPI
          uses these classes to check incoming data automatically.
Called by: router.py, service.py, store.py
"""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

# 0 = Monday ... 6 = Sunday. Anything else is rejected before our code runs.
Weekday = Annotated[int, Field(ge=0, le=6)]


class CallScheduleCreate(BaseModel):
    """What the frontend sends when a user says "call me for my study time"."""

    user_id: str
    # E.164 format: "+" country code and number, no spaces. Example: +15555550100
    phone_e164: str = Field(pattern=r"^\+[1-9]\d{6,14}$")
    # IANA time zone name, e.g. "America/Los_Angeles". Needed so "08:00" means
    # the user's 08:00, also when daylight saving time changes.
    timezone: str
    local_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")  # "HH:MM"
    weekdays: list[Weekday] = Field(min_length=1)
    # What the user wants to work on. Claude turns this into the call script.
    task_title: str | None = None
    # The user must actively agree to be called. The service refuses without it.
    consent_to_calls: bool


class CallSchedule(CallScheduleCreate):
    """A stored schedule: the input plus what the server adds."""

    id: str
    consent_at: datetime  # when the user agreed (UTC). Kept as proof of consent.
    active: bool = True  # False after the user stops the calls


class CallLogEntry(BaseModel):
    """What we remember about one placed call: status only, never the number."""

    schedule_id: str
    provider_call_id: str
    status: str
    placed_at: datetime  # UTC
