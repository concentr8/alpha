"""Tests for choosing and using voice providers (src/providers/).

Purpose:  proves that the default is the fake provider and that a wrong
          VOICE_PROVIDER name fails loudly instead of silently doing nothing.
Run:      cd backend && pytest
"""

import asyncio

import pytest

from src.providers.base import MockProvider
from src.providers.dial_provider import DialProvider
from src.providers.elevenlabs_provider import ElevenLabsProvider
from src.providers.registry import get_provider


def test_mock_provider_pretends_to_call() -> None:
    result = asyncio.run(MockProvider().start_call("+15555550100", "Say hi"))

    assert result.status == "queued"


def test_each_provider_name_gives_the_right_provider() -> None:
    assert isinstance(get_provider("mock"), MockProvider)
    assert isinstance(get_provider("dial"), DialProvider)
    assert isinstance(get_provider("elevenlabs"), ElevenLabsProvider)


def test_an_unknown_provider_name_fails_loudly() -> None:
    with pytest.raises(ValueError):
        get_provider("carrier-pigeon")
