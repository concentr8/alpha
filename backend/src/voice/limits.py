"""Spending limits for the voice features.

Purpose:  stops one visitor (or a bug) from using up our ElevenLabs credits.
          Two kinds of limit: a short-term limit per visitor, and a daily
          budget for the whole app.
Called by: src/voice/router.py (per visitor), src/voice/service.py (daily budget)
Why:      the voice endpoints are public once the backend is online, and every
          real ElevenLabs call costs credits.
Memory only: counters reset when the server restarts.
TODO: keep the counters in a shared store once more than one server runs.
"""

import time
from collections import defaultdict, deque
from datetime import datetime, timezone

from src.config import settings


class RateLimited(Exception):
    """A limit is used up. The message says which one, in plain words."""


_recent_requests: dict[str, deque[float]] = defaultdict(deque)
_day = ""
_spoken_chars_today = 0
_transcriptions_today = 0


def reset() -> None:
    """Forget all counters. Used by tests."""
    global _day, _spoken_chars_today, _transcriptions_today
    _recent_requests.clear()
    _day, _spoken_chars_today, _transcriptions_today = "", 0, 0


def check_visitor(visitor: str, *, now: float | None = None) -> None:
    """Allow at most N requests per hour from one visitor (N from the settings)."""
    now = time.monotonic() if now is None else now
    window = _recent_requests[visitor]
    while window and now - window[0] > 3600:
        window.popleft()
    if len(window) >= settings.voice_requests_per_visitor_per_hour:
        raise RateLimited("Too many voice requests from you. Try again later.")
    window.append(now)


def _start_new_day_if_needed(today: str) -> None:
    global _day, _spoken_chars_today, _transcriptions_today
    if today != _day:
        _day, _spoken_chars_today, _transcriptions_today = today, 0, 0


def _today() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def charge_speech(characters: int, *, today: str | None = None) -> None:
    """Count text we are about to pay ElevenLabs to read aloud (cached text is free)."""
    global _spoken_chars_today
    _start_new_day_if_needed(today or _today())
    if _spoken_chars_today + characters > settings.voice_daily_speech_characters:
        raise RateLimited("The daily voice budget is used up. Try again tomorrow.")
    _spoken_chars_today += characters


def charge_transcription(*, today: str | None = None) -> None:
    """Count one recording we are about to pay ElevenLabs to transcribe."""
    global _transcriptions_today
    _start_new_day_if_needed(today or _today())
    if _transcriptions_today >= settings.voice_daily_transcriptions:
        raise RateLimited("The daily voice budget is used up. Try again tomorrow.")
    _transcriptions_today += 1
