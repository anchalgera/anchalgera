"""Service layer used by the FastAPI endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Message, Session, SessionSummary
from .orchestrator import LLMOrchestrator
from .schemas import MessageSchema


class SessionService:
    """High level session operations."""

    def __init__(self, session: AsyncSession, orchestrator: LLMOrchestrator) -> None:
        self._session = session
        self._orchestrator = orchestrator

    async def create_session(self) -> tuple[Session, str]:
        instance = Session()
        self._session.add(instance)
        await self._session.flush()
        first_question = self._orchestrator.start_session(instance.id)
        await self._store_message(instance.id, "assistant", first_question)
        return instance, first_question

    async def _store_message(self, session_id: int, role: str, content: str) -> Message:
        message = Message(session_id=session_id, role=role, content=content)
        self._session.add(message)
        await self._session.flush()
        self._orchestrator.record_message(
            session_id,
            MessageSchema(role=role, content=content, created_at=message.created_at),
        )
        return message

    async def append_user_message(self, session_id: int, content: str) -> Message:
        return await self._store_message(session_id, "user", content)

    async def append_assistant_message(self, session_id: int, content: str) -> Message:
        return await self._store_message(session_id, "assistant", content)

    async def end_session(self, session_id: int) -> Session:
        instance = await self._session.get(Session, session_id)
        if instance is None:
            raise ValueError("Session not found")
        if instance.ended_at is None:
            instance.ended_at = datetime.utcnow()
            instance.status = "completed"
        await self._session.flush()
        return instance

    async def finalise_session(self, session_id: int) -> SessionSummary:
        existing = await self.fetch_summary(session_id)
        if existing is not None:
            return existing
        messages = await self.fetch_messages(session_id)
        journal_entry, recommendations = self._orchestrator.summarise(messages)
        summary = SessionSummary(
            session_id=session_id,
            journal_entry=journal_entry,
            recommendations=recommendations,
        )
        self._session.add(summary)
        await self._session.flush()
        return summary

    async def fetch_messages(self, session_id: int) -> List[MessageSchema]:
        stmt = (
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        result = await self._session.execute(stmt)
        records = [row[0] for row in result.fetchall()]
        return [
            MessageSchema(role=record.role, content=record.content, created_at=record.created_at)
            for record in records
        ]

    async def fetch_summaries(self) -> List[SessionSummary]:
        stmt = select(SessionSummary).order_by(SessionSummary.created_at.desc())
        result = await self._session.execute(stmt)
        return [row[0] for row in result.fetchall()]

    async def fetch_summary(self, session_id: int) -> SessionSummary | None:
        stmt = select(SessionSummary).where(SessionSummary.session_id == session_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()


__all__ = ["SessionService"]
