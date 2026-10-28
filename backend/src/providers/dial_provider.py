"""Voice provider: Dial (getdial.ai).

Purpose:  places outbound AI voice calls through Dial.
Called by: service.py when VOICE_PROVIDER=dial
Docs:     https://docs.getdial.ai  (TODO: read before implementing; the example
          below comes from the dial-sdk page on PyPI and is untested)
"""

from src.providers.base import CallResult


class DialProvider:
    async def start_call(self, to_e164: str, instruction: str) -> CallResult:
        # TODO: implement with the official `dial-sdk` package. Shape of the
        # quickstart (untested):
        #   async with DialClient(DialConfig(api_key=settings.dial_api_key)) as dial:
        #       call = await dial.make_call(MakeCallParams(
        #           to=to_e164,
        #           from_number_id=settings.dial_from_number_id,
        #           outbound_instruction=instruction))
        #   return CallResult(provider_call_id=call.id, status=call.status)
        raise NotImplementedError
