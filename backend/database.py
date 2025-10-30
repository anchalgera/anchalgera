"""Database utilities for the mindfulness coaching backend."""
from __future__ import annotations

from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from .config import get_settings

_SETTINGS = get_settings()


def _create_engine() -> AsyncEngine:
    return create_async_engine(
        _SETTINGS.database_url,
        echo=False,
        future=True,
    )


engine: AsyncEngine = _create_engine()
AsyncSessionLocal = sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


@asynccontextmanager
async def get_session() -> AsyncSession:
    """Provide an async SQLAlchemy session context manager."""

    async with AsyncSessionLocal() as session:
        yield session


__all__ = ["engine", "AsyncSessionLocal", "get_session"]
