from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.dependencies import get_sectors
from app.schemas.common import Envelope, ResponseMeta
from app.services.company_service import CompanyService
from app.services.research_service import ResearchService
from app.services.sectors_client import SectorsClient, SectorsError

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def dashboard(sectors: SectorsClient = Depends(get_sectors)):
    research = await ResearchService(sectors).collect("ANTM")
    reports = research["reports"]
    companies = [CompanyService(sectors)._normalize(symbol, raw) for symbol, raw in reports.items()]
    featured = next((company for company in companies if company["ticker"] == "ANTM"), None)
    kpis = {"nickel_price": None, "nickel_price_date": None, "tracked_companies": None,
            "featured_price": featured["price"] if featured else None,
            "featured_market_cap": featured["market_cap"] if featured else None}
    series = []
    try:
        year = datetime.now(timezone.utc).year
        prices, _ = await sectors.commodity_prices("nickel", year - 1, year)
        series = sorted([{"date": row["date"], "price": row["price_usd_per_ton"]}
                         for row in prices if row.get("date") and row.get("price_usd_per_ton") is not None],
                        key=lambda item: item["date"])
        if series:
            kpis["nickel_price"] = series[-1]["price"]
            kpis["nickel_price_date"] = series[-1]["date"]
    except SectorsError:
        pass
    try:
        mining, _ = await sectors.mining_companies("nickel")
        kpis["tracked_companies"] = (mining.get("pagination") or {}).get("total_count")
    except SectorsError:
        pass
    source = "sectors" if reports or series or kpis["tracked_companies"] is not None else "unavailable"
    return Envelope(data={"kpis": kpis, "signals": research["signals"], "companies": companies,
                          "featured_company": featured, "commodity_series": series,
                          "signal_status": research["status"], "signal_reason": research.get("reason")},
                    meta=ResponseMeta(source=source,
                        disclosure="Signals are Hestra-derived from Sectors facts; unavailable metrics are null."))


@router.get("/signals")
async def signals(sectors: SectorsClient = Depends(get_sectors)):
    research = await ResearchService(sectors).collect("ANTM")
    return Envelope(data=research["signals"],
                    meta=ResponseMeta(source="sectors" if research["status"] == "resolved" else "unavailable",
                        disclosure="Signals are derived by Hestra from Sectors data."))
