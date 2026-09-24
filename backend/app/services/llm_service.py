import json
from collections.abc import AsyncIterator
from dataclasses import dataclass
import httpx
from app.core.config import Settings, get_settings
from app.schemas.chat import LLMRouterConfig, ModelListRequest


@dataclass
class LLMCompletion:
    content: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class LLMService:
    """Provider-neutral LLM boundary for OpenAI-compatible routers."""

    def __init__(self, settings: Settings | None = None, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings or get_settings()
        self.transport = transport

    def configured(self, override: LLMRouterConfig | None = None) -> bool:
        return all([self._api_key(override), self._base_url(override), self._model(override)])

    def source(self, override: LLMRouterConfig | None = None) -> str:
        return "unavailable" if not self.configured(override) else "llm"

    def _provider(self, override: LLMRouterConfig | ModelListRequest | None = None) -> str:
        value = override.provider if override is not None else self.settings.llm_provider
        return value.strip().lower()

    def _base_url(self, override: LLMRouterConfig | ModelListRequest | None = None) -> str:
        value = override.base_url if override is not None else self.settings.llm_base_url
        return value.rstrip("/")

    def _api_key(self, override: LLMRouterConfig | ModelListRequest | None = None) -> str:
        return override.api_key if override is not None else self.settings.llm_api_key

    def _model(self, override: LLMRouterConfig | None = None) -> str:
        return override.model if override is not None else self.settings.llm_model

    def _extra_headers(self, override: LLMRouterConfig | ModelListRequest | None = None) -> dict[str, str]:
        headers: dict[str, str] = {}
        if self.settings.llm_extra_headers:
            try:
                headers.update({str(k): str(v) for k, v in json.loads(self.settings.llm_extra_headers).items()})
            except json.JSONDecodeError as exc:
                raise ValueError("LLM_EXTRA_HEADERS must be a valid JSON object") from exc
        if override and override.extra_headers:
            headers.update({str(k): str(v) for k, v in override.extra_headers.items()})
        return headers

    def _headers(self, override: LLMRouterConfig | ModelListRequest | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self._api_key(override)}",
            "Content-Type": "application/json",
        }
        if self._provider(override) == "bynara":
            headers["X-Hestra-Provider"] = "bynara-router"
        headers.update(self._extra_headers(override))
        return headers

    def _payload(self, prompt: str, override: LLMRouterConfig | None = None) -> dict:
        return {
            "model": self._model(override),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are Hestra AI, an analyst copilot for Indonesia nickel research. "
                        "Ground answers in the provided context, separate facts from hypotheses, "
                        "and never invent financial or market values."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }

    def _estimate_tokens(self, text: str) -> int:
        return max(1, len(text) // 4)

    async def complete(self, prompt: str, override: LLMRouterConfig | None = None) -> str:
        return (await self.complete_with_usage(prompt, override)).content

    async def complete_with_usage(self, prompt: str, override: LLMRouterConfig | None = None) -> LLMCompletion:
        if not self.configured(override):
            raise RuntimeError("AI model gateway is not configured")
        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds, transport=self.transport) as client:
            response = await client.post(
                f"{self._base_url(override)}/chat/completions",
                headers=self._headers(override),
                json=self._payload(prompt, override),
            )
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                raise RuntimeError(f"LLM gateway error {response.status_code}: {response.text[:500]}") from exc
            payload = response.json()
            content = payload["choices"][0]["message"]["content"]
            usage = payload.get("usage") or {}
            prompt_tokens = int(usage.get("prompt_tokens") or self._estimate_tokens(prompt))
            completion_tokens = int(usage.get("completion_tokens") or self._estimate_tokens(content))
            total_tokens = int(usage.get("total_tokens") or prompt_tokens + completion_tokens)
            return LLMCompletion(content=content, prompt_tokens=prompt_tokens, completion_tokens=completion_tokens, total_tokens=total_tokens)

    async def structured(self, prompt: str, override: LLMRouterConfig | None = None) -> dict:
        text = await self.complete(prompt, override)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"summary": text}

    async def stream(self, prompt: str, override: LLMRouterConfig | None = None) -> AsyncIterator[str]:
        text = await self.complete(prompt, override)
        for token in text.split():
            yield token + " "

    async def list_models(self, request: ModelListRequest) -> list[str]:
        async with httpx.AsyncClient(timeout=self.settings.llm_timeout_seconds, transport=self.transport) as client:
            response = await client.get(f"{self._base_url(request)}/models", headers=self._headers(request))
            response.raise_for_status()
            payload = response.json()
            raw_models = payload.get("data", []) if isinstance(payload, dict) else payload
            names = [item["id"] if isinstance(item, dict) and "id" in item else str(item) for item in raw_models]
            return sorted({name for name in names if name})
