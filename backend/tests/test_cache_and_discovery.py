import asyncio
import httpx
import pytest
from app.api.auth import hash_password, verify_password
from app.core.config import Settings
from app.services.discovery_service import DiscoveryService
from app.services.sectors_client import SectorsClient, SectorsRateLimited


@pytest.mark.asyncio
async def test_concurrent_sectors_calls_share_one_request():
    calls = 0

    async def handler(request):
        nonlocal calls
        calls += 1
        await asyncio.sleep(0.02)
        return httpx.Response(200, json={"company_name": "ANTM"})

    client = SectorsClient(Settings(sectors_api_key="test", sectors_cache_ttl_seconds=60), httpx.MockTransport(handler))
    try:
        results = await asyncio.gather(*(client.company_report("ANTM") for _ in range(10)))
        assert calls == 1
        assert all(result[0]["company_name"] == "ANTM" for result in results)
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_request_budget_blocks_uncached_calls_but_not_cached_calls():
    calls = 0

    async def handler(request):
        nonlocal calls
        calls += 1
        return httpx.Response(200, json={"ok": True})

    client = SectorsClient(Settings(sectors_api_key="test", sectors_requests_per_minute=1), httpx.MockTransport(handler))
    try:
        assert (await client.get("/first"))[1] is False
        assert (await client.get("/first"))[1] is True
        with pytest.raises(SectorsRateLimited):
            await client.get("/second")
        assert calls == 1
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_discover_filters_real_directory_and_caches_pages():
    calls = 0

    async def handler(request):
        nonlocal calls
        calls += 1
        offset = request.url.params.get("offset")
        if offset:
            return httpx.Response(200, json={"results": [{"symbol": "INCO.JK", "name": "Vale", "slug": "vale", "key_operation": "Smelter", "commodity_type": ["nickel"]}],
                "pagination": {"has_next": False}})
        return httpx.Response(200, json={"results": [{"symbol": "ANTM.JK", "name": "Antam", "slug": "antam", "key_operation": "Mine", "commodity_type": ["nickel"]}],
            "pagination": {"has_next": True, "next_offset": 1}})

    client = SectorsClient(Settings(sectors_api_key="test"), httpx.MockTransport(handler))
    try:
        service = DiscoveryService(client)
        result = await service.search("Smelter")
        assert result["total"] == 1 and result["companies"][0]["ticker"] == "INCO"
        assert (await service.search("ANTM"))["total"] == 1
        assert calls == 2
    finally:
        await client.close()


def test_password_hash_is_salted_and_verified():
    first, second = hash_password("SecurePassword123!"), hash_password("SecurePassword123!")
    assert first != second
    assert verify_password("SecurePassword123!", first)
    assert not verify_password("wrong", first)
