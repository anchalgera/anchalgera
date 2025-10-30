"""Text-to-speech integration helpers."""
from __future__ import annotations

from typing import Protocol


class Synthesizer(Protocol):
    """Protocol describing how to convert text into audio."""

    async def synthesize(self, text: str) -> bytes:
        """Return audio data for the provided ``text``."""


class SilentSynthesizer:
    """Development synthesizer that returns silence.

    The implementation simply returns an empty ``bytes`` payload which signals to
    consumers that audio synthesis was intentionally skipped.
    """

    async def synthesize(self, text: str) -> bytes:
        return b""


__all__ = ["Synthesizer", "SilentSynthesizer"]
