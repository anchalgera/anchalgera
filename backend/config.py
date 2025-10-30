"""Configuration settings for the backend application."""
from __future__ import annotations

from functools import lru_cache
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application configuration loaded from environment variables.

    Attributes
    ----------
    database_url:
        Location of the SQLite database used to store session transcripts and
        generated summaries. Defaults to a local file inside the backend
        package directory.
    session_duration_seconds:
        Number of seconds to keep a conversation session alive before it is
        automatically terminated.
    enable_text_to_speech:
        Toggle for enabling the optional text-to-speech synthesizer. When
        disabled the backend will skip generation of spoken responses.
    """

    database_url: str = Field(
        default="sqlite+aiosqlite:///backend/app.db",
        description="SQLite database used by SQLAlchemy",
    )
    session_duration_seconds: int = Field(
        default=300,
        description="Maximum duration of an active coaching session in seconds.",
    )
    enable_text_to_speech: bool = Field(
        default=False,
        description="Whether to synthesize spoken responses for prompts.",
    )

    class Config:
        env_prefix = "MINDFUL_"
        env_file = ".env"
        case_sensitive = False


@lru_cache()
def get_settings() -> Settings:
    """Return a cached instance of :class:`Settings`."""

    return Settings()


__all__ = ["Settings", "get_settings"]
