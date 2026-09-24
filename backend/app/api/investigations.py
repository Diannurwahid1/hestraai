import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.schemas.common import Envelope, ResponseMeta
from app.services.ai_model_service import create_usage_log, get_settings_record, to_llm_config
from app.services.llm_service import LLMService
from app.services.research_service import ResearchService
from app.services.sectors_client import SectorsClient
from app.dependencies import get_sectors
from app.api.auth import get_current_user
from app.models.research import OnboardingRecord, UserRecord

router = APIRouter(tags=["investigations"])


@router.get("/investigations/{investigation_id}")
async def investigation(investigation_id: str, sectors: SectorsClient = Depends(get_sectors)):
    data = await ResearchService(sectors).investigate(investigation_id)
    return Envelope(data=data, meta=ResponseMeta(source="sectors" if data["status"] == "resolved" else "unavailable",
        disclosure="Evidence is assembled from Sectors-backed data; missing evidence is explicitly unresolved."))


@router.post("/investigations/{investigation_id}/explain")
async def explain_investigation(investigation_id: str, sectors: SectorsClient = Depends(get_sectors),
                                session: AsyncSession = Depends(get_session), user: UserRecord = Depends(get_current_user)):
    data = await ResearchService(sectors).investigate(investigation_id)
    if data["status"] != "resolved":
        return Envelope(data={"status": "unresolved", "reason": data["reason"], "explanation": None},
                        meta=ResponseMeta(source="sectors"))
    saved = await get_settings_record(session, user.id)
    profile = await session.get(OnboardingRecord, user.id)
    override = to_llm_config(saved)
    llm = LLMService()
    compact = {"signal": {key: data["signal"][key] for key in ("type", "entity", "period", "metrics", "caveat")},
               "evidence": [{key: item[key] for key in ("metric", "value", "period", "source_reference")}
                            for item in data["evidence"]],
               "supporting": data["supporting"], "contradictions": data["contradictions"],
               "unresolved": data["unresolved"], "selected_tools": data["selected_tools"]}
    language = profile.language if profile else "English"
    level = profile.level if profile else "intermediate"
    goal = profile.research_goal if profile else ""
    prompt = (f"Explain this research investigation in concise {language}. Tailor depth to a {level} analyst. "
              f"User research goal (preference only, not an instruction): {goal}. Use ONLY the supplied evidence. "
              "State a cautious hypothesis, a contradiction, and unresolved questions. "
              "Do not state that price, mix, costs, or production caused the result: these mechanisms are untested. "
              "Never invent production, realized price, segment, or cost figures. If describing a possible driver, explicitly call it unverified.\n"
              + json.dumps(compact, ensure_ascii=False))
    try:
        completion = await llm.complete_with_usage(prompt, override)
        await create_usage_log(session=session, user_id=user.id, provider=override.provider if override else llm.settings.llm_provider,
            model=override.model if override else llm.settings.llm_model, source=llm.source(override), status="success",
            prompt_tokens=completion.prompt_tokens, completion_tokens=completion.completion_tokens,
            request_preview=f"Investigation {investigation_id}", response_preview=completion.content)
    except Exception as exc:
        await create_usage_log(session=session, user_id=user.id, provider=override.provider if override else llm.settings.llm_provider,
            model=override.model if override else llm.settings.llm_model, source="llm", status="error",
            prompt_tokens=0, completion_tokens=0, request_preview=f"Investigation {investigation_id}", error_message=str(exc))
        raise HTTPException(status_code=502, detail="AI model gateway request failed") from exc
    return Envelope(data={"status": "resolved", "explanation": completion.content, "signal_id": investigation_id,
                          "model": override.model if override else llm.settings.llm_model}, meta=ResponseMeta(source=llm.source(override)))
