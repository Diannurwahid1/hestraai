"""Deterministic research signals. All inputs must be normalized Sectors facts."""

from datetime import datetime, timezone
from app.analytics.growth import percentage_change
from app.analytics.margins import margin, margin_change_pp
from app.analytics.peer_metrics import peer_median

REVENUE_GROWTH_THRESHOLD = 10.0
MARGIN_DECLINE_PP_THRESHOLD = -2.0
PEER_GAP_PP_THRESHOLD = 4.0
COMMODITY_CHANGE_THRESHOLD = 10.0
COMMODITY_MARGIN_GAP_PP_THRESHOLD = 2.0
ENGINE_VERSION = "hestra_signal_engine_v1"


def financial_periods(report: dict) -> dict[int, dict]:
    rows = (report.get("financials") or {}).get("historical_financials") or []
    return {int(row["year"]): row for row in rows if isinstance(row, dict) and row.get("year")}


def margin_for(row: dict | None) -> float | None:
    if not row or row.get("ebitda") is None or row.get("revenue") is None:
        return None
    return margin(float(row["ebitda"]), float(row["revenue"]))


def evidence(metric: str, value: float, period: str, ticker: str | None, field: str,
             *, source_type: str = "company_financials", inputs: dict | None = None) -> dict:
    reference = (f"/v2/company/report/{ticker}/#financials.historical_financials.{field}"
                 if ticker else f"/v2/mining/commodities/nickel/price/#price_usd_per_ton")
    return {"metric": metric, "value": round(value, 2), "period": period,
            "source": "sectors", "source_type": source_type,
            "source_reference": reference, "inputs": inputs or {}}


def confidence(required_count: int, optional_count: int = 0, history: bool = False,
               proxy: bool = False) -> tuple[float, str]:
    score = min(1.0, required_count * 0.35 + optional_count * 0.1 + (0.1 if history else 0))
    if proxy:
        score = min(score, 0.79)
    score = round(score, 2)
    return score, "high" if score >= 0.8 else "medium" if score >= 0.55 else "low"


def _signal(ticker: str, kind: str, year: int, summary: str, metrics: dict,
            items: list[dict], score: tuple[float, str], severity: str,
            caveat: str | None = None, peer_universe: list[str] | None = None) -> dict:
    return {
        "signal_id": f"sig_{ticker.lower()}_{kind}_{year}", "id": f"sig_{ticker.lower()}_{kind}_{year}",
        "type": kind, "entity": ticker, "ticker": ticker, "period": str(year),
        "severity": severity, "title": kind.replace("_", " ").title(), "summary": summary,
        "metrics": metrics, "evidence": items, "peer_universe": peer_universe or [],
        "confidence_score": score[0], "confidence_label": score[1],
        "derived_by": ENGINE_VERSION, "generated_at": datetime.now(timezone.utc).isoformat(),
        "caveat": caveat, "context_id": f"signal.sig_{ticker.lower()}_{kind}_{year}",
        "investigation_id": f"sig_{ticker.lower()}_{kind}_{year}",
    }


class SignalEngine:
    def detect_signals(self, company: dict, financial: dict | None = None,
                       mining: dict | None = None, commodity: dict | None = None,
                       peers: list[dict] | None = None) -> list[dict]:
        ticker = company["ticker"].upper()
        if mining is not None and not mining.get("verified_nickel"):
            return []
        periods = financial or financial_periods(company)
        years = sorted(periods)
        result: list[dict] = []
        if len(years) < 2:
            return result

        # Revenue is explicitly a sales/activity proxy; no production claim is made.
        for year in reversed(years):
            prior = periods.get(year - 1)
            current = periods[year]
            if not prior or not current or not current.get("revenue") or not prior.get("revenue"):
                continue
            current_margin, prior_margin = margin_for(current), margin_for(prior)
            if current_margin is None or prior_margin is None:
                continue
            revenue_growth = percentage_change(float(current["revenue"]), float(prior["revenue"]))
            margin_delta = margin_change_pp(current_margin, prior_margin)
            if revenue_growth is not None and revenue_growth >= REVENUE_GROWTH_THRESHOLD and margin_delta <= MARGIN_DECLINE_PP_THRESHOLD:
                items = [
                    evidence("revenue_growth_yoy", revenue_growth, f"{year-1}–{year}", ticker, "revenue",
                             inputs={"current": current["revenue"], "previous": prior["revenue"], "formula": "(current / previous - 1) * 100"}),
                    evidence("ebitda_margin_change_pp", margin_delta, f"{year-1}–{year}", ticker, "ebitda,revenue",
                             inputs={"current_ebitda": current["ebitda"], "current_revenue": current["revenue"],
                                     "previous_ebitda": prior["ebitda"], "previous_revenue": prior["revenue"],
                                     "formula": "current EBITDA/revenue * 100 - previous EBITDA/revenue * 100"}),
                ]
                score = confidence(2, int(bool(peers)) + int(bool(commodity)), True, proxy=True)
                result.append(_signal(ticker, "operational_financial_divergence", year,
                    f"Revenue grew {revenue_growth:.2f}% YoY while EBITDA margin fell {abs(margin_delta):.2f} percentage points. Production volume is unavailable.",
                    {"revenue_growth_yoy": revenue_growth, "ebitda_margin_change_pp": margin_delta,
                     "ebitda_margin": current_margin, "activity_proxy": "company_revenue"}, items, score,
                    "high" if margin_delta <= -5 else "medium",
                    caveat="Revenue is a company-wide activity proxy, not nickel production volume. Sectors mining data does not provide production history."))
                break

        latest = years[-1]
        own_margin = margin_for(periods[latest])
        peer_rows = [(p["ticker"], margin_for(financial_periods(p).get(latest))) for p in (peers or [])]
        usable_peers = [(name, value) for name, value in peer_rows if value is not None and name != ticker]
        if own_margin is not None and len(usable_peers) >= 3:
            median_value = peer_median([value for _, value in usable_peers])
            gap = round(own_margin - median_value, 2)
            if abs(gap) >= PEER_GAP_PP_THRESHOLD:
                names = [name for name, _ in usable_peers]
                items = [evidence("company_ebitda_margin", own_margin, str(latest), ticker, "ebitda,revenue",
                                  inputs={"ebitda": periods[latest]["ebitda"], "revenue": periods[latest]["revenue"]})]
                items += [evidence("peer_ebitda_margin", value, str(latest), name, "ebitda,revenue",
                                   inputs={"ebitda": financial_periods(p)[latest]["ebitda"],
                                           "revenue": financial_periods(p)[latest]["revenue"]})
                          for name, value in usable_peers for p in (peers or []) if p["ticker"] == name]
                result.append(_signal(ticker, "peer_divergence", latest,
                    f"EBITDA margin differs from the selected nickel peer median by {gap:+.2f} percentage points.",
                    {"metric_name": "ebitda_margin", "company_value": own_margin,
                     "peer_median": median_value, "difference_pp": gap}, items,
                    confidence(2, 1, True), "high" if abs(gap) >= 8 else "medium",
                    peer_universe=names))

        # Comparable annual commodity averages are supplied by the normalization layer.
        if commodity and latest - 1 in commodity and latest in commodity and own_margin is not None:
            prior_margin = margin_for(periods.get(latest - 1))
            if prior_margin is not None:
                price_change = percentage_change(commodity[latest], commodity[latest - 1])
                margin_delta = margin_change_pp(own_margin, prior_margin)
                if (price_change is not None and abs(price_change) >= COMMODITY_CHANGE_THRESHOLD
                        and abs(margin_delta) >= COMMODITY_MARGIN_GAP_PP_THRESHOLD
                        and price_change * margin_delta < 0):
                    items = [
                        evidence("nickel_price_change_yoy", price_change, f"{latest-1}–{latest}", None, "price_usd_per_ton",
                                 source_type="commodity_price", inputs={"current_annual_avg": commodity[latest],
                                                                          "previous_annual_avg": commodity[latest-1]}),
                        evidence("ebitda_margin_change_pp", margin_delta, f"{latest-1}–{latest}", ticker, "ebitda,revenue",
                                 inputs={"current_ebitda": periods[latest]["ebitda"], "current_revenue": periods[latest]["revenue"],
                                         "previous_ebitda": periods[latest-1]["ebitda"], "previous_revenue": periods[latest-1]["revenue"]}),
                    ]
                    result.append(_signal(ticker, "commodity_financial_divergence", latest,
                        f"Nickel benchmark price moved {price_change:+.2f}% while company EBITDA margin moved {margin_delta:+.2f} percentage points.",
                        {"commodity_change_yoy": price_change, "ebitda_margin_change_pp": margin_delta},
                        items, confidence(2, 1, True), "high" if abs(margin_delta) >= 5 else "medium",
                        caveat="Benchmark nickel price is not the company's realized selling price."))
        return result
