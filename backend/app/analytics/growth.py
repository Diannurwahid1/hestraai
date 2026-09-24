def percentage_change(current: float, previous: float) -> float | None:
    if previous == 0:
        return None
    return round((current - previous) / abs(previous) * 100, 2)


def yoy_growth(values: list[float]) -> float | None:
    return percentage_change(values[-1], values[-2]) if len(values) >= 2 else None

