def detect_operational_financial_divergence(production_growth: float, margin_change_pp: float) -> dict:
    detected = production_growth > 10 and margin_change_pp < -2
    return {
        "detected": detected,
        "signal": "operational_financial_divergence" if detected else None,
        "severity": "high" if detected and margin_change_pp <= -5 else "medium" if detected else "low",
        "inputs": {"production_growth": production_growth, "margin_change_pp": margin_change_pp},
    }

