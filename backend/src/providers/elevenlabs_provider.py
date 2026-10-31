"""Voice provider: ElevenLabs agent + Twilio phone number.

Purpose:  places outbound calls with an ElevenLabs voice agent.
Called by: service.py when VOICE_PROVIDER=elevenlabs
Docs:     https://elevenlabs.io/docs/api-reference/twilio/outbound-call
          (API reference, read on 2026-10-23). It describes ONE direct request,
          so we do not need to run a relay server of our own (the older guide at
          .../guides/twilio/outbound-calling builds one with Node + ngrok).
Request:  POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call
          (US region: api.us.elevenlabs.io). Required fields: agent_id,
          agent_phone_number_id, to_number. Per-call script goes in
          conversation_initiation_client_data.conversation_config_override:
          agent.first_message (must name Concentr8 and say it is an AI) and
          agent.prompt.prompt (= our instruction). Answer: success, message,
          conversation_id, callSid.
Needs in ElevenLabs agent settings (from the older guide): authentication on, and
          per-call overrides allowed for first message and system prompt.
          TODO: check where the Twilio number is added in ElevenLabs, because the
          request wants its id (agent_phone_number_id), and check the call price.
"""

from src.providers.base import CallResult


class ElevenLabsProvider:
    async def start_call(self, to_e164: str, instruction: str) -> CallResult:
        # TODO: implement with httpx (already in requirements.txt): send the
        # request described above, return CallResult(conversation_id, status).
        raise NotImplementedError
