"""The one shape every voice provider must follow.

Purpose:  lets us swap Dial, ElevenLabs+Twilio or a fake without touching the
          rest of the code. service.py only knows this interface.
Called by: service.py, and each *_provider.py implements it.
"""

from dataclasses import dataclass
from typing import Protocol


@dataclass
class CallResult:
    provider_call_id: str  # the provider's own id, for looking the call up later
    status: str  # e.g. "queued", "ringing", "failed"


class VoiceProvider(Protocol):
    async def start_call(self, to_e164: str, instruction: str) -> CallResult:
        """Call this number and let the AI voice follow `instruction`."""
        ...


class MockProvider:
    """Fake provider: pretends to call. Default, so nothing real happens by accident."""

    async def start_call(self, to_e164: str, instruction: str) -> CallResult:
        return CallResult(provider_call_id="mock-1", status="queued")
