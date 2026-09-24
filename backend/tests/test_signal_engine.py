import pytest
from app.analytics.peer_metrics import peer_median
from app.analytics.signal_engine import SignalEngine, confidence
from app.services.research_service import ResearchService, annual_nickel_prices
from app.services.sectors_client import SectorsUnavailable


def report(ticker, prior_revenue=100, prior_ebitda=30, revenue=120, ebitda=24):
    return {"ticker": ticker, "financials": {"historical_financials": [
        {"year": 2024, "revenue": prior_revenue, "ebitda": prior_ebitda},
        {"year": 2025, "revenue": revenue, "ebitda": ebitda},
    ]}}


def test_operational_financial_signal_has_provenance_and_proxy_caveat():
    signals = SignalEngine().detect_signals(report("ANTM"))
    signal = next(item for item in signals if item["type"] == "operational_financial_divergence")
    assert signal["metrics"]["revenue_growth_yoy"] == 20
    assert signal["metrics"]["ebitda_margin_change_pp"] == -10
    assert signal["confidence_label"] == "medium"
    assert "not nickel production" in signal["caveat"]
    assert all(item["source"] == "sectors" and item["source_reference"] and item["period"] for item in signal["evidence"])
    assert signal["derived_by"] == "hestra_signal_engine_v1"


def test_no_operational_signal_below_threshold_or_with_missing_data():
    assert not any(s["type"] == "operational_financial_divergence" for s in
                   SignalEngine().detect_signals(report("ANTM", revenue=105)))
    assert SignalEngine().detect_signals({"ticker": "ANTM", "financials": {"historical_financials": []}}) == []


def test_peer_median_and_divergence():
    assert peer_median([20, 30, 40, 100]) == 35
    company = report("ANTM", revenue=100, ebitda=10)
    peers = [report("INCO", revenue=100, ebitda=25), report("NCKL", revenue=100, ebitda=30),
             report("MBMA", revenue=100, ebitda=35)]
    signal = next(s for s in SignalEngine().detect_signals(company, peers=peers) if s["type"] == "peer_divergence")
    assert signal["metrics"]["peer_median"] == 30
    assert signal["metrics"]["difference_pp"] == -20
    assert signal["peer_universe"] == ["INCO", "NCKL", "MBMA"]
    assert len(signal["evidence"]) == 4


def test_confidence_and_commodity_missing_data():
    assert confidence(2, 0, True, proxy=True) == (0.79, "medium")
    assert confidence(1) == (0.35, "low")
    assert not any(s["type"] == "commodity_financial_divergence" for s in
                   SignalEngine().detect_signals(report("ANTM"), commodity={}))
    rows = [{"date": f"2024-{month:02d}-01", "price_usd_per_ton": 20000} for month in range(1, 13)]
    rows += [{"date": f"2025-{month:02d}-01", "price_usd_per_ton": 16000} for month in range(1, 13)]
    assert annual_nickel_prices(rows) == {2024: 20000, 2025: 16000}


@pytest.mark.asyncio
async def test_sectors_failure_returns_unresolved_without_fabricated_evidence():
    class FailedSectors:
        async def company_report(self, *_):
            raise SectorsUnavailable("temporarily unavailable")

    service = ResearchService(FailedSectors())
    result = await service.investigate("sig_antm_operational_financial_divergence_2024")
    assert result["status"] == "unresolved"
    assert result["evidence"] == []
    assert result["signal"] is None


@pytest.mark.asyncio
async def test_investigation_assembles_source_facts_and_marks_production_unresolved():
    class FixtureSectors:
        async def company_report(self, symbol, _sections):
            company = report(symbol, prior_revenue=100, prior_ebitda=30,
                             revenue=120 if symbol == "ANTM" else 100,
                             ebitda=24 if symbol == "ANTM" else 30)
            company["peers"] = [{"peers_data": {"companies": [
                {"symbol": f"{ticker}.JK"} for ticker in ("ANTM", "INCO", "NCKL", "MBMA", "NICL")]}}]
            return company, False

        async def mining_companies(self, _commodity, offset=0):
            return {"results": [{"symbol": f"{ticker}.JK"} for ticker in
                    ("ANTM", "INCO", "NCKL", "MBMA", "NICL")],
                    "pagination": {"has_next": False}}, False

        async def commodity_prices(self, *_):
            return [], False

    result = await ResearchService(FixtureSectors()).investigate("sig_antm_operational_financial_divergence_2025")
    assert result["status"] == "resolved"
    assert "production" in " ".join(result["unresolved"]).lower()
    assert len(result["evidence"]) >= 5
    assert all(item["source"] == "sectors" and item["source_reference"] for item in result["evidence"])
    assert "mining" in result["selected_tools"] and "peer" in result["selected_tools"]
