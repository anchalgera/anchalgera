"""Conversation and summarisation logic for the mindfulness coach."""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Deque, Dict, Iterable, List

from .schemas import MessageSchema


DEFAULT_QUESTIONS: List[str] = [
    "How was your day?",
    "What is one thing you are grateful for today?",
    "Did you encounter any challenges?",
    "How did you take care of yourself today?",
    "What is one intention for tomorrow?",
]


@dataclass
class ConversationState:
    questions: Deque[str] = field(default_factory=lambda: deque(DEFAULT_QUESTIONS))
    history: List[MessageSchema] = field(default_factory=list)


class LLMOrchestrator:
    """Manages question prompts and summarisation.

    This class encapsulates the logic that would normally be handled by a large
    language model. The default implementation uses deterministic templates so
    the backend works even without direct LLM access, but the methods can be
    extended to integrate with OpenAI, Azure, or other vendors.
    """

    def __init__(self) -> None:
        self._conversations: Dict[int, ConversationState] = {}

    def start_session(self, session_id: int) -> str:
        state = ConversationState()
        self._conversations[session_id] = state
        return state.questions[0]

    def record_message(self, session_id: int, message: MessageSchema) -> None:
        state = self._conversations.setdefault(session_id, ConversationState())
        state.history.append(message)

    def next_question(self, session_id: int) -> str | None:
        state = self._conversations.get(session_id)
        if not state:
            return None
        if state.questions:
            # Discard the question that was already asked and return the next one.
            state.questions.popleft()
        if state.questions:
            return state.questions[0]
        return None

    def summarise(self, messages: Iterable[MessageSchema]) -> tuple[str, str]:
        """Produce a journal entry and actionable recommendations."""

        transcript = "\n".join(f"{m.role}: {m.content}" for m in messages)
        journal_entry = (
            "Daily Reflection Summary:\n" + transcript + "\n\n"
            "Overall, focus on gratitude, acknowledging challenges, and planning"
            " supportive actions for tomorrow."
        )
        recommendations = (
            "1. Celebrate one positive moment from today.\n"
            "2. Address a noted challenge with a small, concrete next step.\n"
            "3. Schedule a self-care activity aligned with tomorrow's intention."
        )
        return journal_entry, recommendations


__all__ = ["LLMOrchestrator", "ConversationState", "DEFAULT_QUESTIONS"]
