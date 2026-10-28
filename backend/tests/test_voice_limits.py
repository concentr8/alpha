"""Tests for the voice spending limits (src/voice/limits.py).

Purpose:  proves one visitor and the whole app cannot spend without bound, and
          that cached audio is not charged.
Run:      cd backend && pytest
"""

import tempfile

import pytest

from src.config import settings
from src.voice import limits, service


def setup_function() -> None:
    limits.reset()
    settings.voice_requests_per_visitor_per_hour = 3
    settings.voice_daily_speech_characters = 100
    settings.voice_daily_transcriptions = 2
    settings.elevenlabs_api_key = "test-key"
    settings.elevenlabs_voice_id = "voice-1"
    settings.voice_cache_dir = tempfile.mkdtemp()


def ok_post(url, headers, **request):
    return 200, b'{"text": "hi"}' if "speech-to-text" in url else b"AUDIO"


def test_a_visitor_gets_only_so_many_requests_per_hour() -> None:
    for second in range(3):
        limits.check_visitor("visitor-a", now=float(second))

    with pytest.raises(limits.RateLimited):
        limits.check_visitor("visitor-a", now=10.0)

    limits.check_visitor("visitor-b", now=10.0)  # someone else is not affected
    limits.check_visitor("visitor-a", now=4000.0)  # an hour later it works again


def test_the_daily_speech_budget_stops_new_text_but_not_cached_text() -> None:
    assert service.speak("a" * 60, post=ok_post) == b"AUDIO"

    with pytest.raises(limits.RateLimited):
        service.speak("b" * 60, post=ok_post)  # 120 characters would pass 100

    assert service.speak("a" * 60, post=ok_post) == b"AUDIO"  # cached, free


def test_the_budget_starts_again_on_a_new_day() -> None:
    limits.charge_speech(100, today="2026-10-23")
    with pytest.raises(limits.RateLimited):
        limits.charge_speech(1, today="2026-10-23")

    limits.charge_speech(100, today="2026-10-24")


def test_the_daily_transcription_budget_stops_the_third_recording() -> None:
    service.transcribe(b"1", "audio/webm", post=ok_post)
    service.transcribe(b"2", "audio/webm", post=ok_post)

    with pytest.raises(limits.RateLimited):
        service.transcribe(b"3", "audio/webm", post=ok_post)
