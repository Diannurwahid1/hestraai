"""Build display components solely from verified evidence, never from model prose."""

from collections.abc import Mapping


def _card(metric: str, value: object, period: object, source: str, entity: str = "") -> dict | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return {"metric": metric, "value": value, "period": str(period or "Period unavailable"),
            "source": "Sectors", "source_reference": source, "entity": entity}


def build_chat_presentation(context: object) -> dict:
    result: dict = {"cards": [], "chart": None, "unresolved": []}
    if not isinstance(context, Mapping):
        return result
    if context.get("status") == "unresolved":
        result["unresolved"] = [str(context.get("reason") or "Evidence unavailable")]
        return result
    if "signal" in context:
        for item in context.get("evidence") or []:
            card = _card(str(item.get("metric") or "Metric"), item.get("value"), item.get("period"),
                         str(item.get("source_reference") or "Sectors source unavailable"))
            if card:
                result["cards"].append(card)
        result["cards"] = result["cards"][:6]
        result["unresolved"] = [str(item) for item in context.get("unresolved") or []]
        return result
    companies = context.get("company_comparison")
    if companies is None and context.get("entity"):
        companies = [context]
    for company in companies or []:
        if company.get("status") == "unresolved":
            result["unresolved"].append(str(company.get("reason") or "Company report unavailable"))
            continue
        entity = str(company.get("entity") or "")
        metrics = company.get("metrics") or {}
        source = company.get("provenance")
        if isinstance(source, Mapping):
            source = source.get("company_report")
        source = str(source or f"/v2/company/report/{entity}/")
        for metric in ("revenue_growth_yoy", "ebitda_margin", "roe", "revenue"):
            card = _card(metric, metrics.get(metric), company.get("period") or metrics.get("financial_year"), source, entity)
            if card:
                result["cards"].append(card)
        history = company.get("financial_history") or []
        points = [{"period": str(row.get("year")), "value": row.get("revenue")}
                  for row in history if isinstance(row.get("revenue"), (int, float))]
        if result["chart"] is None and len(points) >= 2:
            result["chart"] = {"title": f"{entity} revenue history", "unit": "IDR", "points": points[-6:],
                               "source": "Sectors", "source_reference": source}
    result["cards"] = result["cards"][:6]
    return result
