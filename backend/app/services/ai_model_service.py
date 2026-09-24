from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.research import AIModelSettingRecord, AIUsageLogRecord
from app.schemas.chat import LLMRouterConfig


def _env_config(user_id: str) -> AIModelSettingRecord:
    settings = get_settings()
    return AIModelSettingRecord(
        user_id=user_id,
        provider=settings.llm_provider,
        base_url=settings.llm_base_url,
        api_key=settings.llm_api_key,
        model=settings.llm_model,
        extra_headers={},
        models=[],
    )


async def get_settings_record(session: AsyncSession, user_id: str) -> AIModelSettingRecord:
    result = await session.execute(select(AIModelSettingRecord).where(AIModelSettingRecord.user_id == user_id))
    return result.scalar_one_or_none() or _env_config(user_id)


async def save_settings(
    session: AsyncSession,
    user_id: str,
    provider: str,
    base_url: str,
    api_key: str,
    model: str,
    extra_headers: dict[str, str] | None = None,
    models: list[str] | None = None,
) -> AIModelSettingRecord:
    result = await session.execute(select(AIModelSettingRecord).where(AIModelSettingRecord.user_id == user_id))
    record = result.scalar_one_or_none()
    prior = record or _env_config(user_id)
    prior_provider, prior_base_url, prior_api_key = prior.provider, prior.base_url, prior.api_key
    if not record:
        record = AIModelSettingRecord(user_id=user_id)
        session.add(record)
    record.provider = provider
    record.base_url = base_url.rstrip("/")
    record.api_key = api_key or (prior_api_key if provider == prior_provider and record.base_url == prior_base_url else "")
    record.model = model
    record.extra_headers = extra_headers or {}
    if models is not None:
        record.models = models
    record.updated_at = datetime.utcnow()
    await session.commit()
    await session.refresh(record)
    return record


def to_llm_config(record: AIModelSettingRecord | None) -> LLMRouterConfig | None:
    if not record:
        return None
    return LLMRouterConfig(
        provider=record.provider,
        base_url=record.base_url,
        api_key=record.api_key,
        model=record.model,
        extra_headers=record.extra_headers or {},
    )


def serialize_settings(record: AIModelSettingRecord) -> dict:
    return {
        "user_id": record.user_id,
        "provider": record.provider,
        "base_url": record.base_url,
        "api_key": "",
        "has_api_key": bool(record.api_key),
        "model": record.model,
        "extra_headers": record.extra_headers or {},
        "models": record.models or [],
        "updated_at": record.updated_at.isoformat() if record.updated_at else None,
    }


async def create_usage_log(
    session: AsyncSession,
    user_id: str,
    provider: str,
    model: str,
    source: str,
    status: str,
    prompt_tokens: int,
    completion_tokens: int,
    request_preview: str,
    response_preview: str = "",
    error_message: str = "",
) -> AIUsageLogRecord:
    record = AIUsageLogRecord(
        id=str(uuid4()),
        user_id=user_id,
        provider=provider,
        model=model,
        source=source,
        status=status,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        request_preview=request_preview[:1200],
        response_preview=response_preview[:1200],
        error_message=error_message[:1200],
    )
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


async def usage_summary(session: AsyncSession, user_id: str) -> dict:
    since = datetime.utcnow() - timedelta(days=30)
    result = await session.execute(
        select(
            func.count(AIUsageLogRecord.id),
            func.coalesce(func.sum(AIUsageLogRecord.prompt_tokens), 0),
            func.coalesce(func.sum(AIUsageLogRecord.completion_tokens), 0),
            func.coalesce(func.sum(AIUsageLogRecord.total_tokens), 0),
        ).where(AIUsageLogRecord.user_id == user_id, AIUsageLogRecord.created_at >= since)
    )
    requests, prompt_tokens, completion_tokens, total_tokens = result.one()
    latest = await session.execute(
        select(AIUsageLogRecord).where(AIUsageLogRecord.user_id == user_id).order_by(AIUsageLogRecord.created_at.desc()).limit(1)
    )
    latest_record = latest.scalar_one_or_none()
    return {
        "period_days": 30,
        "requests": requests,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "last_used_at": latest_record.created_at.isoformat() if latest_record else None,
    }


async def recent_logs(session: AsyncSession, user_id: str, limit: int = 30) -> list[dict]:
    result = await session.execute(
        select(AIUsageLogRecord).where(AIUsageLogRecord.user_id == user_id).order_by(AIUsageLogRecord.created_at.desc()).limit(limit)
    )
    return [
        {
            "id": item.id,
            "provider": item.provider,
            "model": item.model,
            "source": item.source,
            "status": item.status,
            "prompt_tokens": item.prompt_tokens,
            "completion_tokens": item.completion_tokens,
            "total_tokens": item.total_tokens,
            "request_preview": item.request_preview,
            "response_preview": item.response_preview,
            "error_message": item.error_message,
            "created_at": item.created_at.isoformat(),
        }
        for item in result.scalars().all()
    ]
