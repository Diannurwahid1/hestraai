from app.analytics.divergence import detect_operational_financial_divergence
from app.analytics.growth import percentage_change
from app.analytics.margins import margin, margin_change_pp
from app.analytics.peer_metrics import peer_average


def test_percentage_change():
    assert percentage_change(118, 100) == 18
    assert percentage_change(2, 0) is None


def test_margin_helpers():
    assert margin(24, 100) == 24
    assert margin_change_pp(24.1, 30.5) == -6.4


def test_divergence_rule():
    result = detect_operational_financial_divergence(18.4, -6.4)
    assert result["detected"] is True
    assert result["severity"] == "high"


def test_peer_average():
    assert peer_average([24.1, 32.8, 28.5, 27.1]) == 28.12

