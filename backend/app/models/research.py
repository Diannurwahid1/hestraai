from datetime import datetime
from sqlalchemy import DateTime, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.session import Base


class ResearchMemoryRecord(Base):
    __tablename__ = "research_memory"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True)
    kind: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(240))
    content: Mapped[str] = mapped_column(Text)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UserRecord(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(160))
    password_hash: Mapped[str] = mapped_column(String(300))
    role: Mapped[str] = mapped_column(String(80), default="Research Analyst")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OnboardingRecord(Base):
    __tablename__ = "user_onboarding"
    user_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    plan: Mapped[str] = mapped_column(String(30), default="explorer")
    level: Mapped[str] = mapped_column(String(30), default="beginner")
    role: Mapped[str] = mapped_column(String(80), default="Analyst")
    focus_tickers: Mapped[list] = mapped_column(JSON, default=list)
    research_goal: Mapped[str] = mapped_column(String(500), default="")
    language: Mapped[str] = mapped_column(String(20), default="English")
    tour_completed: Mapped[bool] = mapped_column(default=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class SessionRecord(Base):
    __tablename__ = "auth_sessions"
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime)


class ChatMessageRecord(Base):
    __tablename__ = "chat_messages"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True)
    role: Mapped[str] = mapped_column(String(20))
    content: Mapped[str] = mapped_column(Text)
    context_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    model: Mapped[str | None] = mapped_column(String(180), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ChatPresentationRecord(Base):
    __tablename__ = "chat_presentations"
    message_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True)
    data: Mapped[dict] = mapped_column(JSON, default=dict)


class ContextRecord(Base):
    __tablename__ = "attached_contexts"
    id: Mapped[str] = mapped_column(String(120), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True)
    context_type: Mapped[str] = mapped_column(String(40))
    title: Mapped[str] = mapped_column(String(240))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)


class AIModelSettingRecord(Base):
    __tablename__ = "ai_model_settings"
    user_id: Mapped[str] = mapped_column(String(80), primary_key=True)
    provider: Mapped[str] = mapped_column(String(80), default="bynara")
    base_url: Mapped[str] = mapped_column(String(500), default="")
    api_key: Mapped[str] = mapped_column(String(500), default="")
    model: Mapped[str] = mapped_column(String(180), default="")
    extra_headers: Mapped[dict] = mapped_column(JSON, default=dict)
    models: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AIUsageLogRecord(Base):
    __tablename__ = "ai_usage_logs"
    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(80), index=True)
    provider: Mapped[str] = mapped_column(String(80), default="unconfigured")
    model: Mapped[str] = mapped_column(String(180), default="")
    source: Mapped[str] = mapped_column(String(40), default="unavailable")
    status: Mapped[str] = mapped_column(String(40), default="success")
    prompt_tokens: Mapped[int] = mapped_column(Integer, default=0)
    completion_tokens: Mapped[int] = mapped_column(Integer, default=0)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0)
    request_preview: Mapped[str] = mapped_column(Text, default="")
    response_preview: Mapped[str] = mapped_column(Text, default="")
    error_message: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
