from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.models.research import ContextRecord
from app.schemas.chat import ContextAttachment
from app.schemas.common import Envelope, ResponseMeta
from app.api.auth import get_current_user
from app.models.research import UserRecord

router = APIRouter(tags=["context"])


@router.post("/context/attach")
async def attach_context(payload: ContextAttachment, session: AsyncSession = Depends(get_session),
                         user: UserRecord = Depends(get_current_user)):
    record = await session.get(ContextRecord, f"{user.id}:{payload.context_id}")
    if not record:
        record = ContextRecord(id=f"{user.id}:{payload.context_id}", user_id=user.id,
                               context_type=payload.type, title=payload.title, payload=payload.payload)
        session.add(record)
    else:
        record.payload = payload.payload; record.title = payload.title
    await session.commit()
    return Envelope(data={"context_id": payload.context_id, "attached": True}, meta=ResponseMeta(source="database"))
