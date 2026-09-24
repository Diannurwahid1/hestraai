"""Persist research preferences and an explicitly demo-only plan choice."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user, serialize_user
from app.db.session import get_session
from app.models.research import OnboardingRecord, UserRecord
from app.schemas.common import Envelope, ResponseMeta

router = APIRouter(tags=["onboarding"])


class OnboardingInput(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    plan: Literal["explorer", "analyst", "team"]
    level: Literal["beginner", "intermediate", "advanced"]
    role: str = Field(min_length=2, max_length=80)
    focus_tickers: list[str] = Field(default_factory=list, max_length=5)
    research_goal: str = Field(min_length=3, max_length=500)
    language: Literal["English", "Bahasa Indonesia"]

    @field_validator("name", "role", "research_goal")
    @classmethod
    def non_blank(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("This field cannot be blank")
        return value

    @field_validator("focus_tickers")
    @classmethod
    def verified_focus(cls, values: list[str]) -> list[str]:
        allowed = {"ANTM", "INCO", "NCKL", "MBMA", "NICL"}
        normalized = list(dict.fromkeys(value.strip().upper() for value in values))
        if any(value not in allowed for value in normalized):
            raise ValueError("Focus companies must be in the verified nickel universe")
        return normalized


def serialize(record: OnboardingRecord | None) -> dict | None:
    if record is None:
        return None
    return {"plan": record.plan, "level": record.level, "role": record.role,
            "focus_tickers": record.focus_tickers, "research_goal": record.research_goal,
            "language": record.language, "tour_completed": record.tour_completed}


@router.get("/onboarding")
async def get_onboarding(user: UserRecord = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    record = await session.get(OnboardingRecord, user.id)
    return Envelope(data={"user": serialize_user(user), "profile": serialize(record)}, meta=ResponseMeta(source="database"))


@router.put("/onboarding")
async def save_onboarding(request: OnboardingInput, user: UserRecord = Depends(get_current_user),
                          session: AsyncSession = Depends(get_session)):
    record = await session.get(OnboardingRecord, user.id)
    if record is None:
        record = OnboardingRecord(user_id=user.id)
        session.add(record)
    record.plan = request.plan
    record.level = request.level
    record.role = request.role.strip()
    record.focus_tickers = request.focus_tickers
    record.research_goal = request.research_goal.strip()
    record.language = request.language
    user.name = request.name.strip()
    user.role = request.role.strip()
    await session.commit()
    return Envelope(data={"user": serialize_user(user), "profile": serialize(record)}, meta=ResponseMeta(source="database"))


@router.post("/onboarding/tour-complete")
async def complete_tour(user: UserRecord = Depends(get_current_user), session: AsyncSession = Depends(get_session)):
    record = await session.get(OnboardingRecord, user.id)
    if record is None:
        raise HTTPException(status_code=409, detail="Complete your research profile first")
    record.tour_completed = True
    await session.commit()
    return Envelope(data={"profile": serialize(record)}, meta=ResponseMeta(source="database"))
