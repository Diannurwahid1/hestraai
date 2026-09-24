"""Verified nickel company directory from the existing Sectors client."""

from app.services.sectors_client import SectorsClient


class DiscoveryService:
    def __init__(self, sectors: SectorsClient):
        self.sectors = sectors

    async def directory(self) -> list[dict]:
        async def fetch():
            offset = 0
            rows: list[dict] = []
            for _ in range(10):
                page, _ = await self.sectors.mining_companies("nickel", offset)
                rows.extend(page.get("results") or [])
                pagination = page.get("pagination") or {}
                if not pagination.get("has_next"):
                    break
                offset = int(pagination["next_offset"])
            return [{"ticker": (row.get("symbol") or "").split(".")[0] or None,
                     "name": row.get("name"), "slug": row.get("slug"),
                     "company_type": row.get("company_type"),
                     "operation": row.get("key_operation"),
                     "commodities": row.get("commodity_type") or []}
                    for row in rows]
        data, _ = await self.sectors.research_cache.get_or_set("nickel_directory", fetch)
        return data

    async def search(self, query: str = "", operation: str = "", offset: int = 0, limit: int = 20) -> dict:
        rows = await self.directory()
        query = query.casefold().strip()
        operation = operation.casefold().strip()
        selected = [row for row in rows if
                    (not query or query in (row["name"] or "").casefold() or query in (row["ticker"] or "").casefold()
                     or query in (row["operation"] or "").casefold())
                    and (not operation or operation == (row["operation"] or "").casefold())]
        return {"companies": selected[offset:offset + limit], "total": len(selected),
                "offset": offset, "limit": limit,
                "operations": sorted({row["operation"] for row in rows if row["operation"]})}
