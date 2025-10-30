"""Pydantic schemas used by the FastAPI application."""
from __future__ import annotations

from datetime import datetime
from typing import List

from pydantic import BaseModel


class MessageSchema(BaseModel):
    role: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True


class SessionStartResponse(BaseModel):
    session_id: int
    question: str


class SessionEndResponse(BaseModel):
    session_id: int
    ended_at: datetime


class SummarySchema(BaseModel):
    session_id: int
    journal_entry: str
    recommendations: str
    created_at: datetime

    class Config:
        orm_mode = True


class JournalListResponse(BaseModel):
    entries: List[SummarySchema]


class JournalDetailResponse(BaseModel):
    session: int
    journal_entry: str
    recommendations: str
    messages: List[MessageSchema]


__all__ = [
    "MessageSchema",
    "SessionStartResponse",
    "SessionEndResponse",
    "SummarySchema",
    "JournalListResponse",
    "JournalDetailResponse",
]
