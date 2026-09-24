import asyncio
import time
from typing import Any
from collections.abc import Awaitable, Callable


class TTLCache:
    def __init__(self, ttl_seconds: int = 300, stale_seconds: int = 3600):
        self.ttl = ttl_seconds
        self.stale = stale_seconds
        self._values: dict[str, tuple[float, float, Any]] = {}
        self._lock = asyncio.Lock()
        self._pending: dict[str, asyncio.Task] = {}

    async def get(self, key: str) -> Any | None:
        async with self._lock:
            item = self._values.get(key)
            if not item or item[0] <= time.monotonic():
                return None
            return item[2]

    async def get_stale(self, key: str) -> Any | None:
        async with self._lock:
            item = self._values.get(key)
            if not item or item[1] <= time.monotonic():
                self._values.pop(key, None)
                return None
            return item[2]

    async def set(self, key: str, value: Any) -> None:
        async with self._lock:
            now = time.monotonic()
            self._values[key] = (now + self.ttl, now + self.ttl + self.stale, value)

    async def get_or_set(self, key: str, factory: Callable[[], Awaitable[Any]]) -> tuple[Any, bool]:
        cached = await self.get(key)
        if cached is not None:
            return cached, True
        async with self._lock:
            pending = self._pending.get(key)
            coalesced = pending is not None
            if pending is None:
                pending = asyncio.create_task(factory())
                self._pending[key] = pending
        try:
            value = await pending
            if not coalesced:
                await self.set(key, value)
            return value, coalesced
        finally:
            if pending.done():
                async with self._lock:
                    if self._pending.get(key) is pending:
                        self._pending.pop(key, None)
