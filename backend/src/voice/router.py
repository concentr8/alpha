"""Web addresses under /voice: read text aloud, turn a recording into text.

Purpose:  the thin web layer. It translates our rules (service.py) into HTTP
          answers and holds no logic of its own.
Called by: src/main.py (plugged in under /voice); the frontend calls it.
Calls:     src/voice/service.py, src/voice/limits.py
"""

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel

from src.voice import limits, service

router = APIRouter()


def _visitor(request: Request) -> str:
    """Who is asking? Behind a proxy every request comes from the proxy's own
    address, so prefer the address the proxy passes on in X-Forwarded-For.
    A caller can fake that header, which is why the daily budget in
    limits.py is the real protection and this is only a first filter."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class SpeakRequest(BaseModel):
    text: str


@router.post("/speak")
def speak(body: SpeakRequest, request: Request) -> Response:
    """Answer with MP3 audio of the given text."""
    try:
        limits.check_visitor(_visitor(request))
        audio = service.speak(body.text)
    except limits.RateLimited as error:
        raise HTTPException(429, str(error)) from error
    except service.VoiceNotConfigured as error:
        raise HTTPException(503, str(error)) from error
    except service.TextTooLong as error:
        raise HTTPException(413, str(error)) from error
    except service.VoiceUpstreamError as error:
        raise HTTPException(502, str(error)) from error
    return Response(content=audio, media_type="audio/mpeg")


@router.post("/transcribe")
async def transcribe(request: Request) -> dict[str, str]:
    """Take the raw recording as the request body and answer with its text.

    Raw body (not a form) so we need no extra upload package.
    """
    audio = await request.body()
    content_type = request.headers.get("content-type", "audio/webm")
    try:
        limits.check_visitor(_visitor(request))
        text = service.transcribe(audio, content_type)
    except limits.RateLimited as error:
        raise HTTPException(429, str(error)) from error
    except service.VoiceNotConfigured as error:
        raise HTTPException(503, str(error)) from error
    except service.AudioTooLarge as error:
        raise HTTPException(413, str(error)) from error
    except service.VoiceUpstreamError as error:
        raise HTTPException(502, str(error)) from error
    return {"text": text}
