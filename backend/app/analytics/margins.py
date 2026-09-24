def margin_change_pp(current: float, previous: float) -> float:
    return round(current - previous, 2)


def margin(numerator: float, denominator: float) -> float | None:
    return round(numerator / denominator * 100, 2) if denominator else None

