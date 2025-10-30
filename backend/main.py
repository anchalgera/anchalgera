"""FastAPI entry point for the mindfulness coaching backend."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from datetime import datetime
from typing import AsyncGenerator

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from .config import get_settings
from .database import engine, get_session
from .models import Base
from .orchestrator import LLMOrchestrator
from .schemas import (
    JournalDetailResponse,
    JournalListResponse,
    MessageSchema,
    SessionEndResponse,
    SessionStartResponse,
    SummarySchema,
)
from .services import SessionService
from .transcriber import MockTranscriber, Transcriber
from .tts import SilentSynthesizer, Synthesizer


SETTINGS = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.state.orchestrator = LLMOrchestrator()
app.state.transcriber = MockTranscriber()  # Replace with Whisper/OpenAI implementation.
app.state.synthesizer = SilentSynthesizer()


def get_orchestrator() -> LLMOrchestrator:
    return app.state.orchestrator


def get_transcriber() -> Transcriber:
    return app.state.transcriber


def get_synthesizer() -> Synthesizer:
    return app.state.synthesizer


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with get_session() as session:
        yield session


async def schedule_auto_end(session_id: int) -> None:
    await asyncio.sleep(SETTINGS.session_duration_seconds)
    async with get_session() as session:
        service = SessionService(session, get_orchestrator())
        try:
            await service.end_session(session_id)
            await service.finalise_session(session_id)
            await session.commit()
        except ValueError:
            await session.rollback()
        except Exception:
            await session.rollback()
            raise


@app.post("/session/start", response_model=SessionStartResponse)
async def start_session(
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_db_session),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
) -> SessionStartResponse:
    service = SessionService(session, orchestrator)
    try:
        instance, first_question = await service.create_session()
        await session.commit()
    except SQLAlchemyError as exc:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    background_tasks.add_task(schedule_auto_end, instance.id)
    return SessionStartResponse(session_id=instance.id, question=first_question)


@app.post("/session/{session_id}/end", response_model=SessionEndResponse)
async def end_session(
    session_id: int,
    session: AsyncSession = Depends(get_db_session),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
) -> SessionEndResponse:
    service = SessionService(session, orchestrator)
    try:
        instance = await service.end_session(session_id)
        await service.finalise_session(session_id)
        await session.commit()
    except ValueError as exc:
        await session.rollback()
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except SQLAlchemyError as exc:
        await session.rollback()
        raise HTTPException(status_code=500, detail="Unable to end session") from exc

    return SessionEndResponse(session_id=session_id, ended_at=instance.ended_at or datetime.utcnow())


@app.websocket("/session/{session_id}/stream")
async def stream_audio(
    websocket: WebSocket,
    session_id: int,
    transcriber: Transcriber = Depends(get_transcriber),
    synthesizer: Synthesizer = Depends(get_synthesizer),
) -> None:
    await websocket.accept()
    orchestrator = get_orchestrator()
    try:
        async with get_session() as db_session:
            service = SessionService(db_session, orchestrator)
            while True:
                try:
                    message = await websocket.receive()
                except WebSocketDisconnect:
                    break

                data: bytes | None = None
                if message.get("bytes") is not None:
                    data = message["bytes"]
                elif message.get("text") is not None:
                    data = message["text"].encode("utf-8")

                if not data:
                    continue

                transcript = await transcriber.transcribe_chunk(data)
                await service.append_user_message(session_id, transcript)
                await db_session.commit()
                await websocket.send_json({"type": "transcript", "text": transcript})

                next_question = orchestrator.next_question(session_id)
                if next_question:
                    await service.append_assistant_message(session_id, next_question)
                    await db_session.commit()
                    await websocket.send_json({"type": "question", "text": next_question})
                    if SETTINGS.enable_text_to_speech:
                        audio = await synthesizer.synthesize(next_question)
                        await websocket.send_bytes(audio)
                else:
                    await websocket.send_json({"type": "complete"})
                    break
    finally:
        try:
            await websocket.close()
        except RuntimeError:
            pass


@app.get("/journals", response_model=JournalListResponse)
async def list_journals(
    session: AsyncSession = Depends(get_db_session),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
) -> JournalListResponse:
    service = SessionService(session, orchestrator)
    summaries = await service.fetch_summaries()
    entries = [
        SummarySchema(
            session_id=summary.session_id,
            journal_entry=summary.journal_entry,
            recommendations=summary.recommendations,
            created_at=summary.created_at,
        )
        for summary in summaries
    ]
    return JournalListResponse(entries=entries)


@app.get("/journals/{session_id}", response_model=JournalDetailResponse)
async def get_journal(
    session_id: int,
    session: AsyncSession = Depends(get_db_session),
    orchestrator: LLMOrchestrator = Depends(get_orchestrator),
) -> JournalDetailResponse:
    service = SessionService(session, orchestrator)
    summary = await service.fetch_summary(session_id)
    if summary is None:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    messages = await service.fetch_messages(session_id)
    return JournalDetailResponse(
        session=session_id,
        journal_entry=summary.journal_entry,
        recommendations=summary.recommendations,
        messages=messages,
    )


__all__ = ["app"]
