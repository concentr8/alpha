"""Tests for the /voice web addresses (src/voice/router.py).

Purpose:  proves the HTTP answers (503 without key, 200 with audio, 502 on
          ElevenLabs trouble). ElevenLabs itself is replaced by a fake.
Run:      cd backend && pytest
"""

from fastapi.testclient import TestClient

from src.config import settings
from src.main import app
from src.voice import service

client = TestClient(app)


def setup_function() -> None:
    settings.elevenlabs_api_key = "test-key"
    settings.elevenlabs_voice_id = "voice-1"


def test_speak_without_key_answers_503() -> None:
    settings.elevenlabs_api_key = ""

    assert client.post("/voice/speak", json={"text": "Hi"}).status_code == 503


def test_speak_returns_mp3(monkeypatch) -> None:
    monkeypatch.setattr(service, "_default_post", lambda url, headers, **body: (200, b"MP3"))

    response = client.post("/voice/speak", json={"text": "Hi"})

    assert response.status_code == 200
    assert response.headers["content-type"] == "audio/mpeg"
    assert response.content == b"MP3"


def test_transcribe_without_key_answers_503() -> None:
    settings.elevenlabs_api_key = ""

    response = client.post("/voice/transcribe", content=b"AUDIO", headers={"content-type": "audio/webm"})

    assert response.status_code == 503


def test_too_many_requests_from_one_visitor_answer_429() -> None:
    from src.voice import limits

    limits.reset()
    settings.voice_requests_per_visitor_per_hour = 1
    settings.elevenlabs_api_key = ""  # fails with 503 after the limit check, so no real call

    first = client.post("/voice/speak", json={"text": "Hi"})
    second = client.post("/voice/speak", json={"text": "Hi"})

    assert first.status_code == 503
    assert second.status_code == 429
    settings.voice_requests_per_visitor_per_hour = 60
