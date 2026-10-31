"""Entry point of the backend.

Purpose:  creates the web app, allows the frontend to talk to it, and plugs in
          the feature routers.
Called by: uvicorn (see "Run" in AGENTS.md).
Calls:     src/config.py, src/calls/router.py, src/voice/router.py
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.calls.router import router as calls_router
from src.config import settings
from src.voice.router import router as voice_router

app = FastAPI(title="Concentr8 API")

# CORS: browsers block a page from calling another address unless the server
# allows it. We allow only the frontend's address(es) from the settings.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Each feature owns a router. New features are plugged in here.
app.include_router(calls_router, prefix="/calls", tags=["calls"])
app.include_router(voice_router, prefix="/voice", tags=["voice"])


@app.get("/health")
def health() -> dict[str, str]:
    """Tiny check that the server is alive. Used by tests and by hosting."""
    return {"status": "ok"}
