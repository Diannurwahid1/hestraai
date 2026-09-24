import json

import httpx
import pytest

from app.core.config import Settings
from app.schemas.chat import LLMRouterConfig, ModelListRequest
from app.services.llm_service import LLMService


@pytest.mark.asyncio
async def test_bynara_router_uses_openai_compatible_chat_completion():
    requests = []

    async def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        payload = json.loads(request.content)
        assert request.url == "https://router.bynara.test/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer bynara-secret"
        assert request.headers["x-hestra-provider"] == "bynara-router"
        assert request.headers["x-router-project"] == "hestra-demo"
        assert payload["model"] == "bynara/nickel-analyst"
        assert payload["messages"][0]["role"] == "system"
        assert payload["messages"][1]["content"] == "Explain INCO margin divergence"
        return httpx.Response(200, json={"choices": [{"message": {"content": "Bynara answer"}}]})

    service = LLMService(
        Settings(
            llm_provider="bynara",
            llm_api_key="bynara-secret",
            llm_base_url="https://router.bynara.test/v1",
            llm_model="bynara/nickel-analyst",
            llm_extra_headers='{"X-Router-Project":"hestra-demo"}',
        ),
        transport=httpx.MockTransport(handler),
    )

    response = await service.complete("Explain INCO margin divergence")

    assert response == "Bynara answer"
    assert service.source() == "llm"
    assert len(requests) == 1


@pytest.mark.asyncio
async def test_llm_service_rejects_missing_router_configuration():
    service = LLMService(Settings(llm_provider="bynara", llm_api_key="", llm_base_url="", llm_model=""))

    with pytest.raises(RuntimeError, match="not configured"):
        await service.complete("Any prompt")
    assert service.source() == "unavailable"


@pytest.mark.asyncio
async def test_runtime_router_override_can_change_model_and_credentials():
    async def handler(request: httpx.Request) -> httpx.Response:
        payload = json.loads(request.content)
        assert request.url == "https://hermes.router.test/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer hermes-key"
        assert payload["model"] == "hermes-4"
        return httpx.Response(200, json={"choices": [{"message": {"content": "Hermes answer"}}]})

    service = LLMService(
        Settings(llm_provider="mock", llm_api_key="", llm_base_url="", llm_model=""),
        transport=httpx.MockTransport(handler),
    )
    override = LLMRouterConfig(
        provider="hermes",
        base_url="https://hermes.router.test/v1",
        api_key="hermes-key",
        model="hermes-4",
    )

    response = await service.complete("Use runtime override", override)

    assert response == "Hermes answer"
    assert service.source(override) == "llm"


@pytest.mark.asyncio
async def test_openai_compatible_model_listing():
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "https://router.test/v1/models"
        assert request.headers["authorization"] == "Bearer list-key"
        return httpx.Response(200, json={"data": [{"id": "hermes-4"}, {"id": "step-5-preview"}]})

    service = LLMService(Settings(), transport=httpx.MockTransport(handler))

    models = await service.list_models(
        ModelListRequest(provider="custom", base_url="https://router.test/v1", api_key="list-key")
    )

    assert models == ["hermes-4", "step-5-preview"]
