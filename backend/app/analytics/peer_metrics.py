from statistics import median


def peer_median(values: list[float]) -> float | None:
    return round(median(values), 2) if values else None


def peer_average(values: list[float]) -> float | None:
    return round(sum(values) / len(values), 2) if values else None


def rank_desc(value: float, peers: list[float]) -> int:
    return sorted([*peers, value], reverse=True).index(value) + 1
