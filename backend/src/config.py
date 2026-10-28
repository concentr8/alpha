"""All settings in one place, read from environment variables / backend/.env.

Purpose:  the only file that reads secrets. Other files import `settings`.
Called by: every module that needs a setting.
Why:      one place means no key is ever hard-coded and we can see at a glance
          what the app needs. Names match .env.example.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: str = "development"
    allowed_origins: str = "http://localhost:8080"

    # Which provider places calls: "dial", "elevenlabs" or "mock" (fake, safe default)
    voice_provider: str = "mock"

    # Secrets. Empty by default so the app starts without them (mock mode).
    anthropic_api_key: str = ""
    dial_api_key: str = ""
    dial_from_number_id: str = ""
    elevenlabs_api_key: str = ""
    elevenlabs_agent_id: str = ""
    elevenlabs_voice_id: str = ""
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_phone_number: str = ""

    # ElevenLabs models for speech. Quality first for calm meditation voice.
    elevenlabs_tts_model: str = "eleven_multilingual_v2"
    elevenlabs_stt_model: str = "scribe_v2"
    # Where spoken meditation audio is kept so each text is paid for only once.
    voice_cache_dir: str = ".cache/voice"
    # Spending limits (src/voice/limits.py). Defaults are cautious guesses:
    # we have NOT checked how many characters the ElevenLabs plan includes.
    voice_requests_per_visitor_per_hour: int = 60
    voice_daily_speech_characters: int = 20000
    voice_daily_transcriptions: int = 200

    database_url: str = "sqlite:///./articul8.db"

    @property
    def allowed_origins_list(self) -> list[str]:
        """ALLOWED_ORIGINS is a comma-separated string; split it into a list."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


settings = Settings()
