from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    public_registration_enabled: bool = False
    frontend_origin: str = "http://localhost:3000"
    database_url: str = "sqlite+aiosqlite:///./hestra.db"
    sectors_api_key: str = ""
    sectors_base_url: str = "https://api.sectors.app"
    sectors_cache_ttl_seconds: int = 300
    sectors_company_cache_ttl_seconds: int = 3600
    sectors_mining_cache_ttl_seconds: int = 86400
    sectors_commodity_cache_ttl_seconds: int = 3600
    sectors_requests_per_minute: int = 60
    sectors_max_concurrency: int = 4
    sumopod_api_key: str = ""
    sumopod_webhook_secret: str = ""
    sumopod_webhook_token: str = ""
    sumopod_base_url: str = "https://api-pay-sandbox.sumopod.com"
    hestra_admin_email: str = ""
    llm_provider: str = "unconfigured"
    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = ""
    llm_extra_headers: str = ""
    llm_timeout_seconds: int = 45
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
