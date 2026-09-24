import asyncio
import logging
import time
from collections import deque
from typing import Any
import httpx
from app.core.config import Settings, get_settings
from app.services.cache import TTLCache

logger = logging.getLogger(__name__)


class SectorsError(RuntimeError):
    code = "sectors_error"


class SectorsUnavailable(SectorsError):
    code = "sectors_unavailable"


class SectorsRateLimited(SectorsError):
    code = "sectors_rate_limited"


class SectorsClient:
    def __init__(self, settings: Settings | None = None, transport: httpx.AsyncBaseTransport | None = None):
        self.settings = settings or get_settings()
        self.cache = TTLCache(self.settings.sectors_cache_ttl_seconds)
        self.research_cache = TTLCache(self.settings.sectors_cache_ttl_seconds)
        self._rate_lock = asyncio.Lock()
        self._request_times: deque[float] = deque()
        self._semaphore = asyncio.Semaphore(self.settings.sectors_max_concurrency)
        self.client = httpx.AsyncClient(base_url=self.settings.sectors_base_url.rstrip("/"), timeout=15, transport=transport)

    @property
    def configured(self) -> bool:
        return bool(self.settings.sectors_api_key)

    async def close(self) -> None:
        await self.client.aclose()

    async def get(self, path: str, params: dict[str, Any] | None = None) -> tuple[Any, bool]:
        if not self.configured:
            raise SectorsUnavailable("SECTORS_API_KEY is not configured")
        cache_key = f"{path}:{sorted((params or {}).items())}"
        async def fetch() -> Any:
            for attempt in range(3):
                try:
                    async with self._rate_lock:
                        now = time.monotonic()
                        while self._request_times and self._request_times[0] <= now - 60:
                            self._request_times.popleft()
                        if len(self._request_times) >= self.settings.sectors_requests_per_minute:
                            raise SectorsRateLimited("Sectors request budget reached; retry shortly")
                        self._request_times.append(now)
                    async with self._semaphore:
                        response = await self.client.get(path, params=params, headers={"Authorization": self.settings.sectors_api_key})
                    if response.status_code == 429:
                        if attempt == 2:
                            raise SectorsRateLimited("Sectors rate limit exceeded")
                        await asyncio.sleep(0.25 * (2**attempt))
                        continue
                    response.raise_for_status()
                    return response.json()
                except (httpx.TimeoutException, httpx.NetworkError) as exc:
                    if attempt == 2:
                        logger.warning("Sectors request failed: %s", exc)
                        raise SectorsUnavailable("Sectors is temporarily unavailable") from exc
                    await asyncio.sleep(0.25 * (2**attempt))
                except httpx.HTTPStatusError as exc:
                    raise SectorsError(f"Sectors returned HTTP {exc.response.status_code}") from exc
            raise SectorsUnavailable("Sectors is temporarily unavailable")
        try:
            return await self.cache.get_or_set(cache_key, fetch)
        except SectorsError:
            stale = await self.cache.get_stale(cache_key)
            if stale is not None:
                return stale, True
            raise

    async def company_report(self, symbol: str, sections: list[str] | None = None):
        params = {"sections": ",".join(sections)} if sections else None
        return await self.get(f"/v2/company/report/{symbol.upper()}/", params)

    async def daily(self, symbol: str, start: str, end: str | None = None):
        return await self.get(f"/v2/daily/{symbol.upper()}/", {"start": start, **({"end": end} if end else {})})

    async def mining_companies(self, commodity_type: str = "nickel", offset: int = 0):
        params = {"commodity_type": commodity_type}
        if offset:
            params["offset"] = offset
        return await self.get("/v2/mining/companies/", params)

    async def mining_company(self, slug: str):
        return await self.get(f"/v2/mining/companies/{slug}/")

    async def commodity_prices(self, commodity: str = "nickel", start_year: int | None = None, end_year: int | None = None):
        params = {k: v for k, v in {"start_year": start_year, "end_year": end_year}.items() if v is not None}
        return await self.get(f"/v2/mining/commodities/{commodity}/price/", params)
