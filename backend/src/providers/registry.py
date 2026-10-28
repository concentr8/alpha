"""Picks the voice provider named in the settings.

Purpose:  service.py asks for "the provider" and does not care which one it is
          (ADR 0004). The setting VOICE_PROVIDER decides: mock, dial or
          elevenlabs. The default is mock, so no real call happens by accident.
Called by: service.py
Calls:     config.py, base.py, dial_provider.py, elevenlabs_provider.py
"""

from src.config import settings
from src.providers.base import MockProvider, VoiceProvider
from src.providers.dial_provider import DialProvider
from src.providers.elevenlabs_provider import ElevenLabsProvider


def get_provider(name: str | None = None) -> VoiceProvider:
    """Return the provider called `name`; without a name, use the setting."""
    name = name or settings.voice_provider
    if name == "mock":
        return MockProvider()
    if name == "dial":
        return DialProvider()
    if name == "elevenlabs":
        return ElevenLabsProvider()
    raise ValueError(f"Unknown VOICE_PROVIDER: {name!r} (use mock, dial or elevenlabs)")
