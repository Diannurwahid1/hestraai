from pydantic import BaseModel, Field


class AIModelSettingsRequest(BaseModel):
    user_id: str = ""
    provider: str = Field(default="bynara", max_length=80)
    base_url: str = Field(default="", max_length=500)
    api_key: str = Field(default="", max_length=500)
    model: str = Field(default="", max_length=180)
    extra_headers: dict[str, str] = Field(default_factory=dict)
    models: list[str] = Field(default_factory=list)


class AIModelModelsRequest(BaseModel):
    user_id: str = ""
    provider: str = Field(default="bynara", max_length=80)
    base_url: str = Field(default="", max_length=500)
    api_key: str = Field(default="", max_length=500)
    extra_headers: dict[str, str] = Field(default_factory=dict)
