from itertools import combinations
from math import asin, cos, radians, sin, sqrt

EARTH_RADIUS_M = 6_371_000


def haversine(a: tuple[float, float], b: tuple[float, float]) -> float:
    """Great-circle distance in metres between two (lat, lon) points."""
    lat1, lon1 = map(radians, a)
    lat2, lon2 = map(radians, b)
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 2 * EARTH_RADIUS_M * asin(sqrt(h))


def shortest_loop(start: tuple[float, float], stops: list[tuple[float, float]]) -> tuple[list[int], float]:
    """
    Order stops into the shortest closed loop starting and ending at start.

    Exact Held-Karp solve — O(2^n * n^2), fine for the handful of stops a
    Google Maps link can hold. Returns (stop indices in visit order, loop length in metres).
    """
    n = len(stops)
    if n == 0:
        return [], 0.0

    points = [start, *stops]
    dist = [[haversine(p, q) for q in points] for p in points]

    # best[(subset, last)] = (cost, previous) for paths from start visiting
    # every stop in subset (bitmask over stops) and ending at stop `last`.
    best = {(1 << i, i): (dist[0][i + 1], None) for i in range(n)}

    for size in range(2, n + 1):
        for subset in combinations(range(n), size):
            mask = sum(1 << i for i in subset)
            for last in subset:
                prev_mask = mask & ~(1 << last)
                best[(mask, last)] = min(
                    (best[(prev_mask, k)][0] + dist[k + 1][last + 1], k)
                    for k in subset
                    if k != last
                )

    full = (1 << n) - 1
    total, last = min(
        (best[(full, i)][0] + dist[i + 1][0], i) for i in range(n)
    )

    order = []
    mask = full
    while last is not None:
        order.append(last)
        _, prev = best[(mask, last)]
        mask &= ~(1 << last)
        last = prev

    return order[::-1], total
