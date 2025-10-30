"""Speech-to-text integration helpers."""
from __future__ import annotations

from typing import Protocol


class Transcriber(Protocol):
    """Protocol describing the interface expected from a transcriber."""

    async def transcribe_chunk(self, data: bytes) -> str:
        """Convert an audio chunk into text."""


class MockTranscriber:
    """Fallback implementation that produces placeholder transcripts.

    The mock is helpful in development environments where a full speech-to-text
    stack is not available. It simply returns a short acknowledgement indicating
    the size of the audio payload that was received.
    """

    async def transcribe_chunk(self, data: bytes) -> str:
        byte_count = len(data)
        return f"[audio chunk: {byte_count} bytes]"


__all__ = ["Transcriber", "MockTranscriber"]
