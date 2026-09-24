import uuid
from datetime import datetime
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.auth import get_current_user
from app.db.session import get_session
from app.dependencies import get_sectors
from app.models.research import ResearchMemoryRecord, UserRecord
from app.schemas.common import Envelope, ResponseMeta
from app.services.research_service import ResearchService
from app.services.sectors_client import SectorsClient

router = APIRouter(tags=["research memory"])
MemoryKind = Literal["thesis", "assumption", "note", "investigation", "bookmark"]


class MemoryInput(BaseModel):
    kind: MemoryKind
    title: str = Field(min_length=2, max_length=240)
    content: str = Field(default="", max_length=20000)
    metadata: dict = Field(default_factory=dict)


class MemoryUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=240)
    content: str | None = Field(default=None, max_length=20000)
    metadata: dict | None = None


class CaptureInput(BaseModel):
    signal_id: str
    kind: Literal["bookmark", "investigation"] = "bookmark"


def serialize(record: ResearchMemoryRecord) -> dict:
    return {"id": record.id, "kind": record.kind, "title": record.title,
            "content": record.content, "metadata": record.metadata_json or {},
            "updated_at": record.updated_at.isoformat() if record.updated_at else None}


@router.get("/research-memory")
async def get_memory(kind: MemoryKind | None = None, session: AsyncSession = Depends(get_session),
                     user: UserRecord = Depends(get_current_user)):
    query = select(ResearchMemoryRecord).where(ResearchMemoryRecord.user_id == user.id)
    if kind:
        query = query.where(ResearchMemoryRecord.kind == kind)
    records = (await session.scalars(query.order_by(ResearchMemoryRecord.updated_at.desc()))).all()
    counts = {name: sum(record.kind == name for record in records) for name in
              ("thesis", "assumption", "note", "investigation", "bookmark")}
    return Envelope(data={"records": [serialize(record) for record in records], "counts": counts},
                    meta=ResponseMeta(source="database"))


@router.post("/research-memory")
async def save_memory(payload: MemoryInput, session: AsyncSession = Depends(get_session),
                      user: UserRecord = Depends(get_current_user)):
    record = ResearchMemoryRecord(id=str(uuid.uuid4()), user_id=user.id, kind=payload.kind,
                                  title=payload.title.strip(), content=payload.content,
                                  metadata_json=payload.metadata)
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return Envelope(data=serialize(record), meta=ResponseMeta(source="database"))


@router.post("/research-memory/capture")
async def capture_signal(payload: CaptureInput, session: AsyncSession = Depends(get_session),
                         user: UserRecord = Depends(get_current_user),
                         sectors: SectorsClient = Depends(get_sectors)):
    investigation = await ResearchService(sectors).investigate(payload.signal_id)
    if investigation["status"] != "resolved":
        raise HTTPException(status_code=422, detail=investigation.get("reason") or "Signal unavailable")
    records = (await session.scalars(select(ResearchMemoryRecord).where(
        ResearchMemoryRecord.user_id == user.id, ResearchMemoryRecord.kind == payload.kind))).all()
    existing = next((record for record in records if (record.metadata_json or {}).get("signal_id") == payload.signal_id), None)
    if existing:
        return Envelope(data=serialize(existing), meta=ResponseMeta(source="database"))
    signal = investigation["signal"]
    record = ResearchMemoryRecord(id=str(uuid.uuid4()), user_id=user.id, kind=payload.kind,
        title=f"{signal['entity']} · {signal['title']} · {signal['period']}",
        content=signal["summary"],
        metadata_json={"signal_id": payload.signal_id, "entity": signal["entity"],
                       "period": signal["period"], "evidence": investigation["evidence"],
                       "unresolved": investigation["unresolved"]})
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return Envelope(data=serialize(record), meta=ResponseMeta(source="database"))


@router.patch("/research-memory/{record_id}")
async def update_memory(record_id: str, payload: MemoryUpdate, session: AsyncSession = Depends(get_session),
                        user: UserRecord = Depends(get_current_user)):
    record = await session.get(ResearchMemoryRecord, record_id)
    if not record or record.user_id != user.id:
        raise HTTPException(404, detail="Research record not found")
    if payload.title is not None:
        record.title = payload.title.strip()
    if payload.content is not None:
        record.content = payload.content
    if payload.metadata is not None:
        record.metadata_json = payload.metadata
    record.updated_at = datetime.utcnow()
    await session.commit()
    return Envelope(data=serialize(record), meta=ResponseMeta(source="database"))


@router.delete("/research-memory/{record_id}")
async def delete_memory(record_id: str, session: AsyncSession = Depends(get_session),
                        user: UserRecord = Depends(get_current_user)):
    record = await session.get(ResearchMemoryRecord, record_id)
    if not record or record.user_id != user.id:
        raise HTTPException(404, detail="Research record not found")
    await session.delete(record)
    await session.commit()
    return Envelope(data={"deleted": True, "id": record_id}, meta=ResponseMeta(source="database"))
