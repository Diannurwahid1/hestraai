from app.services.chat_presentation import build_chat_presentation


def test_company_evidence_creates_sourced_cards_and_real_history_chart():
    result = build_chat_presentation({"entity": "ANTM", "period": 2025,
        "metrics": {"revenue_growth_yoy": 12.5, "ebitda_margin": 20},
        "financial_history": [{"year": 2024, "revenue": 100}, {"year": 2025, "revenue": 112.5}],
        "provenance": {"company_report": "/v2/company/report/ANTM/"}})
    assert result["cards"][0]["source_reference"] == "/v2/company/report/ANTM/"
    assert result["chart"]["points"] == [{"period": "2024", "value": 100}, {"period": "2025", "value": 112.5}]


def test_missing_evidence_does_not_create_cards_or_chart():
    result = build_chat_presentation({"status": "unresolved", "reason": "Sectors report unavailable"})
    assert result == {"cards": [], "chart": None, "unresolved": ["Sectors report unavailable"]}
    assert build_chat_presentation({"entity": "INCO", "metrics": {"revenue": None},
        "financial_history": [{"year": 2025, "revenue": 40}]})["chart"] is None


def test_signal_cards_preserve_provenance():
    result = build_chat_presentation({"signal": {"type": "peer_divergence"},
        "evidence": [{"metric": "peer_median", "value": 28.6, "period": "2025",
                      "source_reference": "/v2/company/report/INCO/"}],
        "unresolved": ["Cost detail unavailable"]})
    assert result["cards"][0]["value"] == 28.6
    assert result["cards"][0]["source_reference"] == "/v2/company/report/INCO/"
    assert result["unresolved"] == ["Cost detail unavailable"]
