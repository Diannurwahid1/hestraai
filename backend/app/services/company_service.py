"""Stable company view assembled exclusively from Sectors fields."""

from datetime import datetime, timedelta, timezone
from typing import Any
from app.analytics.growth import percentage_change
from app.analytics.margins import margin
from app.services.discovery_service import DiscoveryService
from app.services.sectors_client import SectorsClient, SectorsError


def _price_extreme(value: dict | None) -> float | None:
    if not isinstance(value, dict) or not value:
        return None
    return float(next(iter(value.values())))


class CompanyService:
    def __init__(self, sectors: SectorsClient):
        self.sectors = sectors

    async def get_company(self, ticker: str) -> tuple[dict[str, Any], str, bool]:
        ticker = ticker.upper()
        raw, cached = await self.sectors.company_report(ticker, ["overview", "financials", "valuation", "peers"])
        data = self._normalize(ticker, raw)
        try:
            directory = await DiscoveryService(self.sectors).directory()
            entry = next((item for item in directory if item["ticker"] == ticker), None)
            if entry:
                data["mining"] = {"name": entry["name"], "operation": entry["operation"],
                                  "company_type": entry["company_type"], "commodities": entry["commodities"]}
                if entry["slug"]:
                    try:
                        detail, detail_cached = await self.sectors.mining_company(entry["slug"])
                        data["mining"].update({"activities": detail.get("activities") or [],
                            "site_count": detail.get("mining_site_count"),
                            "license_count": len(detail.get("mining_license") or []),
                            "licenses": [{"activity": item.get("activity"), "commodity": item.get("commodity_type"),
                                          "location": item.get("location"), "expiry_date": item.get("license_expiry_date")}
                                         for item in (detail.get("mining_license") or [])]})
                        cached = cached or detail_cached
                    except SectorsError:
                        pass
                data["peers"] = [peer for peer in data["peers"] if peer["ticker"] in
                                 {row["ticker"] for row in directory if row["ticker"]}]
        except SectorsError:
            pass
        try:
            start = (datetime.now(timezone.utc) - timedelta(days=90)).date().isoformat()
            prices, price_cached = await self.sectors.daily(ticker, start)
            data["price_history"] = [{"date": row["date"], "close": row.get("close"),
                                      "volume": row.get("volume")} for row in prices if row.get("close") is not None]
            cached = cached or price_cached
        except SectorsError:
            data["price_history"] = []
        return data, "sectors", cached

    def _normalize(self, ticker: str, raw: dict[str, Any]) -> dict[str, Any]:
        overview = raw.get("overview") or {}
        financials = raw.get("financials") or {}
        valuation = raw.get("valuation") or {}
        history = sorted(financials.get("historical_financials") or [], key=lambda item: int(item.get("year") or 0))
        normalized_history = []
        for row in history:
            revenue, ebitda, earnings = row.get("revenue"), row.get("ebitda"), row.get("earnings")
            normalized_history.append({"year": int(row["year"]), "revenue": revenue,
                "ebitda": ebitda, "earnings": earnings,
                "ebitda_margin": margin(float(ebitda), float(revenue)) if ebitda is not None and revenue else None,
                "operating_cash_flow": row.get("operating_cash_flow"),
                "outstanding_shares": row.get("outstanding_shares")})
        latest = normalized_history[-1] if normalized_history else None
        prior = normalized_history[-2] if len(normalized_history) > 1 else None
        latest_valuation = sorted(valuation.get("historical_valuation") or [],
                                  key=lambda item: int(item.get("year") or 0))
        latest_valuation = latest_valuation[-1] if latest_valuation else {}
        ratios = sorted(financials.get("historical_financial_ratio") or [],
                        key=lambda item: int(item.get("year") or 0))
        profitability = (ratios[-1].get("profitability") or {}) if ratios else {}
        peer_blocks = raw.get("peers") or []
        peers = []
        for block in peer_blocks:
            for item in (block.get("peers_data") or {}).get("companies") or []:
                symbol = str(item.get("symbol") or "").split(".")[0]
                if symbol and symbol != ticker and symbol not in {peer["ticker"] for peer in peers}:
                    peers.append({"ticker": symbol, "name": item.get("company_name") or symbol,
                        "year": item.get("year"), "market_cap": item.get("market_cap"),
                        "pe_ttm": item.get("pe_ttm"), "pb_mrq": item.get("pb_mrq"),
                        "revenue": item.get("total_revenue")})
        price_range = overview.get("all_time_price") or {}
        return {
            "ticker": ticker, "name": raw.get("company_name") or ticker,
            "sector": overview.get("industry") or overview.get("sector"), "country": "Indonesia",
            "price": overview.get("last_close_price"), "price_date": overview.get("latest_close_date"),
            "daily_close_change": overview.get("daily_close_change"), "market_cap": overview.get("market_cap"),
            "tags": overview.get("tags") or [], "employee_count": overview.get("employee_num"),
            "listing_date": overview.get("listing_date"), "website": overview.get("website"),
            "esg_score": overview.get("esg_score"),
            "price_range_52w": {"low": _price_extreme(price_range.get("52_w_low")),
                                "high": _price_extreme(price_range.get("52_w_high"))},
            "metrics": {
                "eps": financials.get("eps"), "revenue_growth_yoy": percentage_change(latest["revenue"], prior["revenue"]) if latest and prior and latest["revenue"] is not None and prior["revenue"] is not None else None,
                "earnings_growth_yoy": percentage_change(latest["earnings"], prior["earnings"]) if latest and prior and latest["earnings"] is not None and prior["earnings"] is not None else None,
                "roe": round(float(profitability["roe"]) * 100, 2) if profitability.get("roe") is not None else None,
                "revenue": latest["revenue"] if latest else None,
                "ebitda": latest["ebitda"] if latest else None,
                "earnings": latest["earnings"] if latest else None,
                "ebitda_margin": latest["ebitda_margin"] if latest else None,
                "outstanding_shares": latest["outstanding_shares"] if latest else None,
                "financial_year": latest["year"] if latest else None,
            },
            "financial_history": normalized_history,
            "valuation": {"forward_pe": valuation.get("forward_pe"),
                          "intrinsic_value": valuation.get("intrinsic_value"),
                          "pe": latest_valuation.get("pe"), "pb": latest_valuation.get("pb"),
                          "enterprise_to_ebitda": latest_valuation.get("enterprise_to_ebitda"),
                          "year": latest_valuation.get("year")},
            "peers": peers, "mining": None, "price_history": [],
            "provenance": {"company_report": f"/v2/company/report/{ticker}/",
                           "mining_directory": "/v2/mining/companies/?commodity_type=nickel"},
        }
