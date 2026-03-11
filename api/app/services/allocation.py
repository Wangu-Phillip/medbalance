from __future__ import annotations

from typing import Dict, TypeVar

T = TypeVar("T")  # Generic type for district IDs (can be int or str)


def allocate_fair_share(
    predicted_by_district: Dict[T, float],
    total_available_stock: float,
) -> Dict[T, float]:
    if total_available_stock <= 0 or not predicted_by_district:
        return {district_id: 0.0 for district_id in predicted_by_district}

    total_pred = sum(max(value, 0.0) for value in predicted_by_district.values())
    if total_pred <= 0:
        return {district_id: 0.0 for district_id in predicted_by_district}

    allocations: Dict[T, float] = {}
    for district_id, pred in predicted_by_district.items():
        share = (max(pred, 0.0) / total_pred) * total_available_stock
        allocations[district_id] = min(max(pred, 0.0), share)

    allocated_sum = sum(allocations.values())
    remainder = max(total_available_stock - allocated_sum, 0.0)

    if remainder > 0:
        unmet = {
            district_id: max(predicted_by_district[district_id] - allocations[district_id], 0.0)
            for district_id in predicted_by_district
        }
        unmet_total = sum(unmet.values())
        if unmet_total > 0:
            for district_id, need in unmet.items():
                extra = (need / unmet_total) * remainder
                allocations[district_id] += min(extra, need)

    return {district_id: float(round(quantity, 2)) for district_id, quantity in allocations.items()}
