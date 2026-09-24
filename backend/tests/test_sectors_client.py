import httpx
import pytest
from app.core.config import Settings
from app.services.sectors_client import SectorsClient


@pytest.mark.asyncio
async def test_company_report_uses_auth_and_cache():
    calls = 0
    async def handler(request: httpx.Request):
        nonlocal calls
        calls += 1
        assert request.headers["Authorization"] == "secret"
        return httpx.Response(200, json={"symbol": "ANTM.JK", "company_name": "PT Aneka Tambang Tbk", "overview": {"last_close_price": 1620}})
    client = SectorsClient(Settings(sectors_api_key="secret", sectors_base_url="https://api.sectors.app"), httpx.MockTransport(handler))
    first, cached1 = await client.company_report("ANTM", ["overview"])
    second, cached2 = await client.company_report("ANTM", ["overview"])
    await client.close()
    assert first == second
    assert cached1 is False and cached2 is True and calls == 1

