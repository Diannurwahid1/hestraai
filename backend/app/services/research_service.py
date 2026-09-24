"""Collect and normalize Sectors facts for deterministic research workflows."""

import asyncio
import logging
from collections import defaultdict
from statistics import mean
from time import perf_counter
from app.analytics.signal_engine import SignalEngine
from app.analytics.signal_engine import evidence, financial_periods, margin_for
from app.analytics.growth import percentage_change
from app.analytics.margins import margin_change_pp
from app.analytics.peer_metrics import peer_median
from app.agents.orchestrator import Orchestrator
from app.services.sectors_client import SectorsClient, SectorsError

logger = logging.getLogger(__name__)
NICKEL_PEERS = ("ANTM", "INCO", "NCKL", "MBMA", "NICL")


def annual_nickel_prices(rows: list[dict]) -> dict[int, float]:
    months: dict[int, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for row in rows:
        date, value = row.get("date"), row.get("price_usd_per_ton")
        if isinstance(date, str) and len(date) >= 7 and value is not None:
            months[int(date[:4])][date[:7]].append(float(value))
    return {year: round(mean(mean(values) for values in buckets.values()), 2)
            for year, buckets in months.items() if len(buckets) >= 10}


class ResearchService:
    def __init__(self, sectors: SectorsClient):
        self.sectors = sectors

    async def collect(self, ticker: str = "ANTM") -> dict:
        ticker = ticker.upper()
        cache = getattr(self.sectors, "research_cache", None)
        if cache is not None:
            result, _ = await cache.get_or_set(f"research:{ticker}", lambda: self._collect_uncached(ticker))
            return result
        return await self._collect_uncached(ticker)

    async def _collect_uncached(self, ticker: str) -> dict:
        reports = await asyncio.gather(*[
            self.sectors.company_report(symbol, ["overview", "financials", "peers"])
            for symbol in NICKEL_PEERS], return_exceptions=True)
        report_map = {symbol: response[0] for symbol, response in zip(NICKEL_PEERS, reports)
                      if not isinstance(response, Exception)}
        if ticker not in report_map:
            return {"status": "unresolved", "reason": f"Sectors financial report for {ticker} is unavailable.",
                    "signals": [], "reports": {}, "commodity": {}, "missing": ["company_financials"]}
        missing = []
        try:
            mining_symbols = set()
            offset = 0
            for _ in range(5):
                mining, _ = await self.sectors.mining_companies("nickel", offset)
                mining_symbols.update(str(row.get("symbol") or "").split(".")[0]
                                      for row in mining.get("results", []))
                pagination = mining.get("pagination") or {}
                if not pagination.get("has_next"):
                    break
                offset = int(pagination["next_offset"])
        except SectorsError:
            mining_symbols = set()
            missing.append("nickel_mining_universe")
        if ticker not in mining_symbols:
            return {"status": "unresolved", "reason": f"Nickel mining membership for {ticker} could not be verified from Sectors.",
                    "signals": [], "reports": report_map, "commodity": {}, "missing": missing or ["nickel_mining_universe"]}
        peer_symbols = {str(row.get("symbol") or "").split(".")[0]
                        for group in report_map[ticker].get("peers") or []
                        for row in (group.get("peers_data") or {}).get("companies") or []}
        valid_peers = [symbol for symbol in NICKEL_PEERS if symbol != ticker and
                       symbol in report_map and symbol in peer_symbols and symbol in mining_symbols]
        if len(valid_peers) < 3:
            missing.append("nickel_peer_comparison")
        try:
            years = sorted(financial_periods(report_map[ticker]))
            end_year = years[-1] if years else 2025
            raw_prices, _ = await self.sectors.commodity_prices("nickel", end_year - 2, end_year)
            commodity = annual_nickel_prices(raw_prices)
        except SectorsError:
            commodity = {}
            missing.append("nickel_commodity_history")
        if len(commodity) < 2 and "nickel_commodity_history" not in missing:
            missing.append("nickel_commodity_history")
        company = {**report_map[ticker], "ticker": ticker}
        peers = [{**report_map[symbol], "ticker": symbol} for symbol in valid_peers]
        signals = SignalEngine().detect_signals(company, mining={"verified_nickel": ticker in mining_symbols},
                                                 commodity=commodity, peers=peers)
        for signal in signals:
            logger.info("signal_generated id=%s ticker=%s type=%s evidence_count=%s confidence=%s generated_at=%s",
                        signal["signal_id"], ticker, signal["type"], len(signal["evidence"]),
                        signal["confidence_score"], signal["generated_at"])
        return {"status": "resolved", "signals": signals, "reports": report_map,
                "commodity": commodity, "peer_symbols": valid_peers, "missing": missing}

    async def investigate(self, signal_id: str) -> dict:
        started = perf_counter()
        parts = signal_id.split("_")
        ticker = parts[1].upper() if len(parts) >= 4 and parts[0] == "sig" else "ANTM"
        if ticker not in NICKEL_PEERS:
            return {"id": signal_id, "status": "unresolved", "reason": "Signal entity is not in the verified nickel universe.",
                    "evidence": [], "unresolved": ["Unknown signal entity"], "signal": None}
        collected = await self.collect(ticker)
        signal = next((item for item in collected["signals"] if item["signal_id"] == signal_id), None)
        if not signal:
            reason = collected.get("reason") or "No verified Sectors facts currently support this signal."
            return {"id": signal_id, "status": "unresolved", "reason": reason,
                    "evidence": [], "unresolved": [reason], "signal": None}
        plan = Orchestrator().plan_signal(signal["type"])
        selected_tools = plan.agents
        unresolved = []
        if signal["type"] == "operational_financial_divergence":
            unresolved.append("Production volume history is unavailable in the connected Sectors mining endpoints; revenue is an activity proxy.")
        if "nickel_peer_comparison" in collected["missing"]:
            unresolved.append("Fewer than three verified nickel peer financial reports are available for comparison.")
        if "nickel_commodity_history" in collected["missing"]:
            unresolved.append("Comparable annual nickel benchmark price history is unavailable.")
        unresolved.append("Company-specific realized nickel price and cost-level detail are unavailable; causal attribution remains unresolved.")
        evidence_items = list(signal["evidence"])
        period_year = int(signal["period"])
        commodity = collected["commodity"]
        if period_year in commodity:
            evidence_items.append(evidence("nickel_annual_benchmark", commodity[period_year], str(period_year), None,
                "price_usd_per_ton", source_type="commodity_price",
                inputs={"aggregation": "mean of monthly means, minimum 10 months", "unit": "USD per tonne"}))
            if period_year - 1 in commodity:
                change = percentage_change(commodity[period_year], commodity[period_year - 1])
                evidence_items.append(evidence("nickel_price_change_yoy", change, f"{period_year-1}–{period_year}", None,
                    "price_usd_per_ton", source_type="commodity_price",
                    inputs={"current_annual_avg": commodity[period_year], "previous_annual_avg": commodity[period_year-1]}))
        peer_margins = []
        prior_peer_margins = []
        for peer_ticker in collected.get("peer_symbols", []):
            peer_periods = financial_periods(collected["reports"][peer_ticker])
            peer_margin = margin_for(peer_periods.get(period_year))
            prior_peer_margin = margin_for(peer_periods.get(period_year - 1))
            if peer_margin is not None:
                peer_margins.append(peer_margin)
                evidence_items.append(evidence("peer_ebitda_margin", peer_margin, str(period_year), peer_ticker,
                    "ebitda,revenue", source_type="peer_financials",
                    inputs={"ebitda": peer_periods[period_year]["ebitda"], "revenue": peer_periods[period_year]["revenue"]}))
            if prior_peer_margin is not None:
                prior_peer_margins.append(prior_peer_margin)
        if len(peer_margins) >= 3:
            evidence_items.append({"metric": "peer_median_ebitda_margin", "value": peer_median(peer_margins),
                "period": str(period_year), "source": "sectors", "source_type": "peer_group_derived",
                "source_reference": "Sectors company reports for verified nickel peers; see peer_ebitda_margin evidence",
                "inputs": {"peer_margins": peer_margins, "formula": "median(peer EBITDA margins)"}})
        supporting = [{"statement": signal["summary"], "evidence_metrics": [item["metric"] for item in signal["evidence"]]}]
        contradictions = []
        if signal["type"] == "operational_financial_divergence":
            contradictions.append({"statement": "Company-wide revenue growth cannot establish higher nickel production; company-specific realized price and product mix data are unavailable.",
                                   "evidence_metrics": ["revenue_growth_yoy"]})
            own_periods = financial_periods(collected["reports"][ticker])
            own_current, own_prior = margin_for(own_periods.get(period_year)), margin_for(own_periods.get(period_year - 1))
            next_margin = margin_for(own_periods.get(period_year + 1))
            if next_margin is not None and own_current is not None:
                evidence_items.append(evidence("subsequent_ebitda_margin", next_margin, str(period_year + 1), ticker,
                    "ebitda,revenue", inputs={"ebitda": own_periods[period_year + 1]["ebitda"],
                                             "revenue": own_periods[period_year + 1]["revenue"]}))
                if next_margin > own_current:
                    contradictions.append({"statement": f"EBITDA margin subsequently recovered from {own_current:.2f}% in {period_year} to {next_margin:.2f}% in {period_year + 1}; the original divergence is historical.",
                        "evidence_metrics": ["ebitda_margin_change_pp", "subsequent_ebitda_margin"]})
            if (own_current is not None and own_prior is not None and len(peer_margins) >= 3 and len(prior_peer_margins) >= 3
                    and len(peer_margins) == len(prior_peer_margins)):
                own_change = margin_change_pp(own_current, own_prior)
                peer_change = margin_change_pp(peer_median(peer_margins), peer_median(prior_peer_margins))
                if own_change < 0 < peer_change:
                    contradictions.append({"statement": f"Selected nickel peer median EBITDA margin rose {peer_change:.2f}pp while {ticker} margin fell {abs(own_change):.2f}pp; a shared nickel benchmark alone does not explain the company gap.",
                        "evidence_metrics": ["peer_ebitda_margin", "ebitda_margin_change_pp"]})
        if signal["type"] == "commodity_financial_divergence":
            contradictions.append({"statement": "The nickel benchmark and company EBITDA margin moved in opposite directions.",
                                   "evidence_metrics": ["nickel_price_change_yoy", "ebitda_margin_change_pp"]})
        result = {"id": signal_id, "investigation_id": signal_id, "signal_id": signal_id,
                  "ticker": ticker, "entity": ticker, "status": "resolved", "signal": signal,
                  "evidence": evidence_items, "supporting": supporting,
                  "contradictions": contradictions, "unresolved": unresolved,
                  "selected_tools": selected_tools,
                  "plan": plan.model_dump(),
                  "hypothesis": "The measured divergence is verified, but its economic cause is unresolved with available company-specific evidence.",
                  "confidence_score": signal["confidence_score"], "confidence_label": signal["confidence_label"]}
        logger.info("investigation_generated id=%s signal_id=%s tools=%s missing_evidence=%s duration_ms=%s",
                    signal_id, signal_id, selected_tools, len(unresolved), round((perf_counter() - started) * 1000))
        return result
