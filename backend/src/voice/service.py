"""Speech with ElevenLabs: text to speech (speak) and speech to text (transcribe).

Purpose:  turns text into audio for guided meditation and turns a recorded
          voice message into text for the voice input. Holds the rules (size
          limits, missing key) and the two ElevenLabs requests.
Called by: src/voice/router.py
Calls:     https://api.elevenlabs.io (over httpx); src/config.py for the key.
Why:      the browser never sees the ElevenLabs key. It asks our backend, and
          only the backend talks to ElevenLabs.
"""

import hashlib
import json
import logging
from pathlib import Path
from collections.abc import Callable
from typing import Any

from src.config import settings
from src.voice import limits

logger = logging.getLogger(__name__)

API_BASE = "https://api.elevenlabs.io"

# Limits protect the ElevenLabs credits from a runaway page or a bad actor.
# Spending limits live in src/voice/limits.py.
MAX_TEXT_CHARS = 2000
MAX_AUDIO_BYTES = 10 * 1024 * 1024

# A "post" sends one request and returns (status code, response body).
# Tests pass a fake one, so no test ever reaches ElevenLabs or needs a key.
Post = Callable[..., tuple[int, bytes]]


class VoiceNotConfigured(Exception):
    """The key (or, for speaking, the voice id) is missing in backend/.env."""


class TextTooLong(Exception):
    pass


class AudioTooLarge(Exception):
    pass


class VoiceUpstreamError(Exception):
    """ElevenLabs answered with an error or could not be reached."""


def _default_post(url: str, headers: dict[str, str], **body: Any) -> tuple[int, bytes]:
    # httpx is imported here so the rules above can be tested without it.
    import httpx

    response = httpx.post(url, headers=headers, timeout=60, **body)
    return response.status_code, response.content


def _cache_file(text: str) -> Path:
    # The daily meditation reads the same words to everyone. Saving the audio
    # means ElevenLabs (and our credits) are used once per text, not once per
    # listener. The name changes with voice and model, so a new voice is never
    # served old audio. TODO: when we deploy, use storage that survives restarts.
    key = f"{settings.elevenlabs_voice_id}|{settings.elevenlabs_tts_model}|{text}"
    return Path(settings.voice_cache_dir) / f"{hashlib.sha256(key.encode()).hexdigest()}.mp3"


def _check_key() -> dict[str, str]:
    if not settings.elevenlabs_api_key:
        raise VoiceNotConfigured("ELEVENLABS_API_KEY is empty in backend/.env")
    return {"xi-api-key": settings.elevenlabs_api_key}


def speak(text: str, *, post: Post | None = None) -> bytes:
    """Return MP3 audio of `text` read aloud in the configured voice."""
    post = post or _default_post  # looked up now, so tests can swap it
    headers = _check_key()
    if not settings.elevenlabs_voice_id:
        raise VoiceNotConfigured("ELEVENLABS_VOICE_ID is empty in backend/.env")
    if len(text) > MAX_TEXT_CHARS:
        raise TextTooLong(f"text is longer than {MAX_TEXT_CHARS} characters")

    cached = _cache_file(text)
    if cached.exists():
        return cached.read_bytes()

    limits.charge_speech(len(text))  # only text we really pay for
    url = f"{API_BASE}/v1/text-to-speech/{settings.elevenlabs_voice_id}"
    status, content = post(
        url,
        headers,
        json={"text": text, "model_id": settings.elevenlabs_tts_model},
    )
    if status != 200:
        # Log the status only: the text is the user's own words.
        logger.warning("ElevenLabs text to speech failed with status %s", status)
        raise VoiceUpstreamError(f"ElevenLabs answered {status}")
    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_bytes(content)
    return content


def transcribe(audio: bytes, content_type: str, *, post: Post | None = None) -> str:
    """Return the words spoken in `audio` (a browser recording)."""
    post = post or _default_post
    headers = _check_key()
    if len(audio) > MAX_AUDIO_BYTES:
        raise AudioTooLarge(f"audio is larger than {MAX_AUDIO_BYTES} bytes")

    limits.charge_transcription()
    status, content = post(
        f"{API_BASE}/v1/speech-to-text",
        headers,
        data={"model_id": settings.elevenlabs_stt_model},
        files={"file": ("voice", audio, content_type)},
    )
    if status != 200:
        logger.warning("ElevenLabs speech to text failed with status %s", status)
        raise VoiceUpstreamError(f"ElevenLabs answered {status}")
    return json.loads(content).get("text", "")
