from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from app.dependencies import get_sectors
from app.schemas.common import Envelope, ResponseMeta
from app.services.discovery_service import DiscoveryService
from app.services.research_service import NICKEL_PEERS, ResearchService
from app.services.sectors_client import SectorsClient, SectorsError

router = APIRouter(tags=["discover"])


class AISearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    limit: int = Field(default=8, ge=1, le=20)


@router.get("/discover")
async def discover(view: str = "companies", q: str = "", operation: str = "",
                   offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
                   sectors: SectorsClient = Depends(get_sectors)):
    if view == "signals":
        signals = []
        for ticker in NICKEL_PEERS:
            research = await ResearchService(sectors).collect(ticker)
            signals.extend(research["signals"])
        query = q.casefold().strip()
        selected = [signal for signal in signals if not query or query in signal["ticker"].casefold()
                    or query in signal["type"].casefold() or query in signal["summary"].casefold()]
        selected.sort(key=lambda item: (item["period"], item["severity"] == "high"), reverse=True)
        return Envelope(data={"signals": selected[offset:offset + limit], "total": len(selected),
                              "offset": offset, "limit": limit}, meta=ResponseMeta(source="sectors",
            disclosure="All signals are derived by Hestra from Sectors facts."))
    data = await DiscoveryService(sectors).search(q, operation, offset, limit)
    return Envelope(data=data, meta=ResponseMeta(source="sectors"))


@router.post("/discover/ai-search")
async def ai_search(request: AISearchRequest, sectors: SectorsClient = Depends(get_sectors)):
    """Rank verified directory rows and Hestra signals against a natural-language research query."""
    query = request.query.casefold().strip()
    tokens = {token for token in query.replace("/", " ").replace(",", " ").split() if len(token) > 2}
    directory = await DiscoveryService(sectors).directory()
    companies = []
    for item in directory:
        haystack = " ".join(str(item.get(key) or "") for key in ("ticker", "name", "operation", "company_type", "commodities")).casefold()
        score = sum(2 if token == (item.get("ticker") or "").casefold() else 1 for token in tokens if token in haystack)
        if score:
            companies.append((score, item))
    signals = []
    for ticker in NICKEL_PEERS:
        research = await ResearchService(sectors).collect(ticker)
        for signal in research["signals"]:
            haystack = " ".join(str(signal.get(key) or "") for key in ("ticker", "entity", "type", "title", "summary")).casefold()
            score = sum(2 if token in haystack else 0 for token in tokens)
            if score:
                signals.append((score, signal))
    companies = [item for _, item in sorted(companies, key=lambda value: value[0], reverse=True)[:request.limit]]
    signals = [item for _, item in sorted(signals, key=lambda value: (value[0], value[1].get("severity") == "high"), reverse=True)[:request.limit]]
    if not companies and not signals:
        reason = "No verified company or signal matched this query. Try a ticker, nickel operation, margin, peer, or commodity question."
    else:
        reason = None
    intent = "company_and_signal_research" if companies and signals else "company_research" if companies else "signal_investigation" if signals else "unresolved"
    return Envelope(data={"query": request.query, "intent": intent, "companies": companies, "signals": signals,
                          "result_count": len(companies) + len(signals), "unresolved": reason},
                    meta=ResponseMeta(source="sectors", disclosure="AI Search ranks verified Sectors-backed records; it does not fabricate search results."))
