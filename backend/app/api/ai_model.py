from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.schemas.ai_model import AIModelModelsRequest, AIModelSettingsRequest
from app.schemas.chat import ModelListRequest
from app.schemas.common import Envelope, ResponseMeta
from app.services.ai_model_service import get_settings_record, recent_logs, save_settings, serialize_settings, usage_summary
from app.services.llm_service import LLMService
from app.api.auth import get_current_user
from app.models.research import UserRecord

router = APIRouter(tags=["ai-model"])


@router.get("/ai-model/settings")
async def get_ai_model_settings(session: AsyncSession = Depends(get_session), user: UserRecord = Depends(get_current_user)):
    record = await get_settings_record(session, user.id)
    return Envelope(data=serialize_settings(record), meta=ResponseMeta(source="database"))


@router.put("/ai-model/settings")
async def update_ai_model_settings(request: AIModelSettingsRequest, session: AsyncSession = Depends(get_session), user: UserRecord = Depends(get_current_user)):
    record = await save_settings(
        session=session,
        user_id=user.id,
        provider=request.provider,
        base_url=request.base_url,
        api_key=request.api_key,
        model=request.model,
        extra_headers=request.extra_headers,
        models=request.models,
    )
    return Envelope(data=serialize_settings(record), meta=ResponseMeta(source="database"))


@router.post("/ai-model/models")
async def load_ai_model_list(request: AIModelModelsRequest, session: AsyncSession = Depends(get_session), user: UserRecord = Depends(get_current_user)):
    current = await get_settings_record(session, user.id)
    provider = request.provider or current.provider
    base_url = request.base_url or current.base_url
    api_key = request.api_key or (current.api_key if provider == current.provider and base_url == current.base_url else "")
    extra_headers = request.extra_headers or current.extra_headers or {}
    models = await LLMService().list_models(ModelListRequest(provider=provider, base_url=base_url, api_key=api_key, extra_headers=extra_headers))
    await save_settings(
        session=session,
        user_id=user.id,
        provider=provider,
        base_url=base_url,
        api_key=api_key,
        model=current.model if current.model in models else (models[0] if models else current.model),
        extra_headers=extra_headers,
        models=models,
    )
    return Envelope(data={"models": models}, meta=ResponseMeta(source="llm"))


@router.get("/ai-model/usage")
async def get_ai_model_usage(session: AsyncSession = Depends(get_session), user: UserRecord = Depends(get_current_user)):
    return Envelope(data=await usage_summary(session, user.id), meta=ResponseMeta(source="database"))


@router.get("/ai-model/logs")
async def get_ai_model_logs(limit: int = 30, session: AsyncSession = Depends(get_session), user: UserRecord = Depends(get_current_user)):
    return Envelope(data={"logs": await recent_logs(session, user.id, min(limit, 100))}, meta=ResponseMeta(source="database"))
