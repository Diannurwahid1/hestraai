from typing import Generic, Literal, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class ResponseMeta(BaseModel):
    source: Literal["sectors", "database", "llm", "unavailable"] = "unavailable"
    cached: bool = False
    disclosure: str | None = None


class Envelope(BaseModel, Generic[T]):
    data: T
    meta: ResponseMeta = Field(default_factory=ResponseMeta)


class ErrorDetail(BaseModel):
    code: str
    message: str
