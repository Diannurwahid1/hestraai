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


@pytest.mark.asyncio
async def test_meter_counts_only_real_upstream_calls_and_cache_hits():
    events = []
    async def recorder(endpoint, cache_status, http_status, duration_ms):
        events.append((endpoint, cache_status, http_status, duration_ms))
    async def handler(request):
        return httpx.Response(200, json={"ok": True})
    client = SectorsClient(Settings(sectors_api_key="secret"), httpx.MockTransport(handler), recorder)
    try:
        await client.company_report("ANTM")
        await client.company_report("ANTM")
        assert [event[1] for event in events] == ["upstream", "hit"]
        assert events[0][2] == 200 and events[0][0] == "/v2/company/report/ANTM/"
    finally:
        await client.close()
