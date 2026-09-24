from typing import Any, Literal
from pydantic import BaseModel, Field


class LLMRouterConfig(BaseModel):
    provider: str = Field(default="custom", max_length=40)
    base_url: str = Field(default="", max_length=500)
    api_key: str = Field(default="", max_length=500)
    model: str = Field(default="", max_length=160)
    extra_headers: dict[str, str] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    context_id: str | None = None
    user_id: str = ""
    profile: Literal["junior", "senior"] = "senior"
    llm: LLMRouterConfig | None = None
    model_override: str | None = Field(default=None, max_length=180)


class ModelListRequest(BaseModel):
    provider: str = Field(default="custom", max_length=40)
    base_url: str = Field(min_length=1, max_length=500)
    api_key: str = Field(min_length=1, max_length=500)
    extra_headers: dict[str, str] = Field(default_factory=dict)


class ContextAttachment(BaseModel):
    context_id: str
    type: str
    title: str
    entity: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)


class OrchestrationPlan(BaseModel):
    intent: str
    depth: Literal["quick", "standard", "deep"]
    agents: list[str]
    need_mentor: bool = False
    need_contradiction_check: bool = False
