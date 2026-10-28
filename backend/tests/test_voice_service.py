"""Tests for speaking and transcribing (src/voice/service.py).

Purpose:  proves the rules (missing key, size limits, ElevenLabs errors) and
          the exact requests we send, using a fake "post" so nothing real is
          called and no key is needed.
Run:      cd backend && pytest
"""

import json
import tempfile

import pytest

from src.config import settings
from src.voice import limits, service


def setup_function() -> None:
    limits.reset()
    settings.elevenlabs_api_key = "test-key"
    settings.elevenlabs_voice_id = "voice-1"
    settings.voice_cache_dir = tempfile.mkdtemp()  # fresh, empty cache for every test


def fake_post(status: int, body: bytes):
    """A stand-in for service._default_post that records what it was sent."""
    sent: dict = {}

    def post(url, headers, **request):
        sent.update(url=url, headers=headers, **request)
        return status, body

    post.sent = sent
    return post


def test_speak_sends_text_voice_and_model_and_returns_audio() -> None:
    post = fake_post(200, b"MP3DATA")

    audio = service.speak("Breathe in", post=post)

    assert audio == b"MP3DATA"
    assert post.sent["url"] == "https://api.elevenlabs.io/v1/text-to-speech/voice-1"
    assert post.sent["headers"] == {"xi-api-key": "test-key"}
    assert post.sent["json"] == {"text": "Breathe in", "model_id": "eleven_multilingual_v2"}


def test_speak_without_key_or_voice_says_what_is_missing() -> None:
    settings.elevenlabs_api_key = ""
    with pytest.raises(service.VoiceNotConfigured):
        service.speak("Hi", post=fake_post(200, b""))

    settings.elevenlabs_api_key = "test-key"
    settings.elevenlabs_voice_id = ""
    with pytest.raises(service.VoiceNotConfigured):
        service.speak("Hi", post=fake_post(200, b""))


def test_speak_refuses_text_over_the_limit_without_calling_elevenlabs() -> None:
    post = fake_post(200, b"")

    with pytest.raises(service.TextTooLong):
        service.speak("x" * (service.MAX_TEXT_CHARS + 1), post=post)

    assert post.sent == {}


def test_speak_turns_an_elevenlabs_error_into_our_own_error() -> None:
    with pytest.raises(service.VoiceUpstreamError):
        service.speak("Hi", post=fake_post(401, b"unauthorized"))


def test_transcribe_sends_the_recording_and_returns_the_text() -> None:
    post = fake_post(200, json.dumps({"text": "hello world", "words": []}).encode())

    text = service.transcribe(b"AUDIO", "audio/webm", post=post)

    assert text == "hello world"
    assert post.sent["url"] == "https://api.elevenlabs.io/v1/speech-to-text"
    assert post.sent["data"] == {"model_id": "scribe_v2"}
    assert post.sent["files"] == {"file": ("voice", b"AUDIO", "audio/webm")}


def test_transcribe_refuses_big_audio_and_reports_upstream_errors() -> None:
    post = fake_post(200, b"{}")
    with pytest.raises(service.AudioTooLarge):
        service.transcribe(b"0" * (service.MAX_AUDIO_BYTES + 1), "audio/webm", post=post)
    assert post.sent == {}

    with pytest.raises(service.VoiceUpstreamError):
        service.transcribe(b"AUDIO", "audio/webm", post=fake_post(500, b""))


def test_same_text_is_paid_for_once_and_a_new_voice_gets_new_audio() -> None:
    first = fake_post(200, b"AUDIO-1")
    assert service.speak("Welcome", post=first) == b"AUDIO-1"

    second = fake_post(200, b"AUDIO-2")
    assert service.speak("Welcome", post=second) == b"AUDIO-1"  # from the cache
    assert second.sent == {}

    settings.elevenlabs_voice_id = "voice-2"
    assert service.speak("Welcome", post=second) == b"AUDIO-2"  # different voice
