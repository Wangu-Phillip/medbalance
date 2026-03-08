from __future__ import annotations


def safe_div(num: float, den: float) -> float:
    if den == 0:
        return 0.0
    return num / den
