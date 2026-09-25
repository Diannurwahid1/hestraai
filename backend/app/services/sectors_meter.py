"""Record Sectors HTTP calls and shared-cache outcomes without guessing credits."""

import logging
import uuid
from datetime import datetime, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal
from app.models.research import SectorsRequestRecord

logger = logging.getLogger(__name__)


async def record_sectors_request(endpoint: str, cache_status: str, http_status: int | None,
                                 duration_ms: int | None) -> None:
    try:
        async with SessionLocal() as session:
            session.add(SectorsRequestRecord(id=str(uuid.uuid4()), endpoint=endpoint,
                                             cache_status=cache_status, http_status=http_status,
                                             duration_ms=duration_ms))
            await session.commit()
    except Exception:
        logger.exception("Sectors metering failed; data request remains available")


async def sectors_usage_summary(session: AsyncSession, days: int = 30) -> dict:
    since = datetime.utcnow() - timedelta(days=days)
    rows = (await session.execute(select(
        SectorsRequestRecord.endpoint,
        func.sum(case((SectorsRequestRecord.cache_status == "upstream", 1), else_=0)).label("upstream"),
        func.sum(case((SectorsRequestRecord.cache_status == "hit", 1), else_=0)).label("cache_hits"),
        func.sum(case((SectorsRequestRecord.cache_status == "stale", 1), else_=0)).label("stale_hits"),
        func.sum(case((SectorsRequestRecord.cache_status == "upstream", case((SectorsRequestRecord.http_status >= 400, 1), else_=0)), else_=0)).label("errors"),
    ).where(SectorsRequestRecord.created_at >= since).group_by(SectorsRequestRecord.endpoint))).all()
    endpoints = [{"endpoint": row.endpoint, "upstream_requests": int(row.upstream or 0),
                  "cache_hits": int(row.cache_hits or 0), "stale_hits": int(row.stale_hits or 0),
                  "http_errors": int(row.errors or 0)} for row in rows]
    return {"period_days": days, "upstream_requests": sum(item["upstream_requests"] for item in endpoints),
            "cache_hits": sum(item["cache_hits"] for item in endpoints),
            "stale_hits": sum(item["stale_hits"] for item in endpoints),
            "endpoints": endpoints, "sectors_credits": None,
            "credit_disclosure": "Sectors credit cost is not exposed by the verified API integration. HTTP request count is a capacity proxy, not billed credits."}
