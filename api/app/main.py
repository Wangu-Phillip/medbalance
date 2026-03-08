from __future__ import annotations

import os
import uuid
from collections import defaultdict
from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .db import Base, engine, get_db
from .models import Allocation, District, Forecast, Medicine, StockLevel, UsageHistory
from .schemas import (
    AllocationItem,
    AllocationRunRequest,
    DataUploadRequest,
    ForecastResponse,
    MetricsSummary,
)
from .seed_data import build_sample_payload
from .services.allocation import allocate_fair_share
from .services.forecast import forecast_next
from .services.metrics import safe_div


Base.metadata.create_all(bind=engine)

app = FastAPI(title="MedBalance AI API", version="0.1.0")

origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _persist_payload(payload: DataUploadRequest, db: Session) -> dict[str, int | str]:
    district_map: dict[str, District] = {}
    medicine_map: dict[str, Medicine] = {}

    existing_districts = db.execute(select(District)).scalars().all()
    for district in existing_districts:
        district_map[district.name] = district

    existing_medicines = db.execute(select(Medicine)).scalars().all()
    for medicine in existing_medicines:
        medicine_map[medicine.name] = medicine

    for district_in in payload.districts:
        if district_in.name not in district_map:
            district_obj = District(name=district_in.name)
            db.add(district_obj)
            db.flush()
            district_map[district_in.name] = district_obj

    for medicine_in in payload.medicines:
        if medicine_in.name not in medicine_map:
            medicine_obj = Medicine(name=medicine_in.name)
            db.add(medicine_obj)
            db.flush()
            medicine_map[medicine_in.name] = medicine_obj

    usage_count = 0
    stock_count = 0

    for usage in payload.usage_history:
        district = district_map.get(usage.district_name)
        medicine = medicine_map.get(usage.medicine_name)
        if district is None or medicine is None:
            raise HTTPException(status_code=400, detail="Unknown district or medicine in usage_history")

        existing_usage = db.execute(
            select(UsageHistory).where(
                UsageHistory.district_id == district.id,
                UsageHistory.medicine_id == medicine.id,
                UsageHistory.month == usage.month,
            )
        ).scalar_one_or_none()

        if existing_usage is None:
            db.add(
                UsageHistory(
                    district_id=district.id,
                    medicine_id=medicine.id,
                    month=usage.month,
                    quantity_used=usage.quantity_used,
                )
            )
        else:
            existing_usage.quantity_used = usage.quantity_used
        usage_count += 1

    for stock in payload.stock_levels:
        district = district_map.get(stock.district_name)
        medicine = medicine_map.get(stock.medicine_name)
        if district is None or medicine is None:
            raise HTTPException(status_code=400, detail="Unknown district or medicine in stock_levels")

        existing_stock = db.execute(
            select(StockLevel).where(
                StockLevel.district_id == district.id,
                StockLevel.medicine_id == medicine.id,
                StockLevel.as_of_month == stock.as_of_month,
            )
        ).scalar_one_or_none()

        if existing_stock is None:
            db.add(
                StockLevel(
                    district_id=district.id,
                    medicine_id=medicine.id,
                    as_of_month=stock.as_of_month,
                    quantity_in_stock=stock.quantity_in_stock,
                )
            )
        else:
            existing_stock.quantity_in_stock = stock.quantity_in_stock
        stock_count += 1

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail=f"Upload contains duplicate month records: {exc.orig}") from exc

    return {
        "status": "uploaded",
        "districts": len(payload.districts),
        "medicines": len(payload.medicines),
        "usage_records": usage_count,
        "stock_records": stock_count,
    }


@app.post("/data/upload")
def upload_data(payload: DataUploadRequest, db: Session = Depends(get_db)) -> dict[str, int | str]:
    return _persist_payload(payload, db)


@app.post("/data/seed")
def seed_data(clear_existing: bool = False, db: Session = Depends(get_db)) -> dict[str, int | str]:
    if clear_existing:
        db.query(Allocation).delete()
        db.query(Forecast).delete()
        db.query(StockLevel).delete()
        db.query(UsageHistory).delete()
        db.query(Medicine).delete()
        db.query(District).delete()
        db.commit()

    payload = build_sample_payload()
    result = _persist_payload(payload, db)
    return {"status": "seeded", **result}


@app.get("/forecast", response_model=ForecastResponse)
def forecast_demand(
    district_id: int = Query(..., gt=0),
    medicine_id: int = Query(..., gt=0),
    months: int = Query(1, ge=1, le=3),
    db: Session = Depends(get_db),
):
    history = (
        db.execute(
            select(UsageHistory)
            .where(UsageHistory.district_id == district_id, UsageHistory.medicine_id == medicine_id)
            .order_by(UsageHistory.month.asc())
        )
        .scalars()
        .all()
    )

    if not history:
        raise HTTPException(status_code=404, detail="No usage history found for district/medicine pair")

    values = [item.quantity_used for item in history]
    forecast_result = forecast_next(values)
    last_month = history[-1].month

    if months == 1:
        target_month = date(last_month.year + int(last_month.month == 12), (last_month.month % 12) + 1, 1)
        existing = db.execute(
            select(Forecast).where(
                Forecast.district_id == district_id,
                Forecast.medicine_id == medicine_id,
                Forecast.target_month == target_month,
            )
        ).scalar_one_or_none()
        
        if existing:
            existing.predicted_demand = round(forecast_result.prediction, 2)
            existing.model_used = forecast_result.model_used
        else:
            persisted = Forecast(
                district_id=district_id,
                medicine_id=medicine_id,
                target_month=target_month,
                predicted_demand=round(forecast_result.prediction, 2),
                model_used=forecast_result.model_used,
            )
            db.add(persisted)
        
        db.commit()
        return ForecastResponse(
            district_id=district_id,
            medicine_id=medicine_id,
            target_month=target_month,
            predicted_demand=round(forecast_result.prediction, 2),
            model_used=forecast_result.model_used,
        )

    target_month = date(last_month.year + int(last_month.month == 12), (last_month.month % 12) + 1, 1)
    return ForecastResponse(
        district_id=district_id,
        medicine_id=medicine_id,
        target_month=target_month,
        predicted_demand=round(forecast_result.prediction, 2),
        model_used=forecast_result.model_used,
    )


@app.post("/allocation/run", response_model=list[AllocationItem])
def run_allocation(payload: AllocationRunRequest, db: Session = Depends(get_db)):
    run_id = str(uuid.uuid4())[:8]

    usage_rows = db.execute(select(UsageHistory).order_by(UsageHistory.month.asc())).scalars().all()
    if not usage_rows:
        raise HTTPException(status_code=400, detail="No usage history loaded")

    grouped_usage: dict[tuple[int, int], list[UsageHistory]] = defaultdict(list)
    for row in usage_rows:
        grouped_usage[(row.district_id, row.medicine_id)].append(row)

    per_medicine_predictions: dict[int, dict[int, float]] = defaultdict(dict)
    target_month_lookup: dict[tuple[int, int], date] = {}

    for (district_id, medicine_id), rows in grouped_usage.items():
        values = [row.quantity_used for row in rows]
        result = forecast_next(values)
        latest_month = rows[-1].month
        target_month = payload.target_month or date(
            latest_month.year + int(latest_month.month == 12),
            (latest_month.month % 12) + 1,
            1,
        )
        per_medicine_predictions[medicine_id][district_id] = round(result.prediction, 2)
        target_month_lookup[(district_id, medicine_id)] = target_month

        existing_forecast = db.execute(
            select(Forecast).where(
                Forecast.district_id == district_id,
                Forecast.medicine_id == medicine_id,
                Forecast.target_month == target_month,
            )
        ).scalar_one_or_none()
        
        if existing_forecast:
            existing_forecast.predicted_demand = round(result.prediction, 2)
            existing_forecast.model_used = result.model_used
        else:
            db.add(
                Forecast(
                    district_id=district_id,
                    medicine_id=medicine_id,
                    target_month=target_month,
                    predicted_demand=round(result.prediction, 2),
                    model_used=result.model_used,
                )
            )

    stock_rows = db.execute(select(StockLevel)).scalars().all()
    if not stock_rows:
        raise HTTPException(status_code=400, detail="No stock levels loaded")

    stock_by_medicine: dict[int, float] = defaultdict(float)
    for row in stock_rows:
        stock_by_medicine[row.medicine_id] += row.quantity_in_stock

    allocation_rows: list[Allocation] = []
    for medicine_id, pred_by_district in per_medicine_predictions.items():
        total_available = stock_by_medicine.get(medicine_id, 0.0)
        alloc_map = allocate_fair_share(pred_by_district, total_available)

        for district_id, pred in pred_by_district.items():
            allocated = alloc_map.get(district_id, 0.0)
            shortage = max(pred - allocated, 0.0)
            alloc_row = Allocation(
                run_id=run_id,
                district_id=district_id,
                medicine_id=medicine_id,
                target_month=target_month_lookup[(district_id, medicine_id)],
                predicted_demand=pred,
                allocated_quantity=round(allocated, 2),
                shortage=round(shortage, 2),
            )
            db.add(alloc_row)
            allocation_rows.append(alloc_row)

    db.commit()

    return [
        AllocationItem(
            run_id=row.run_id,
            district_id=row.district_id,
            medicine_id=row.medicine_id,
            target_month=row.target_month,
            predicted_demand=row.predicted_demand,
            allocated_quantity=row.allocated_quantity,
            shortage=row.shortage,
        )
        for row in allocation_rows
    ]


@app.get("/allocation/latest", response_model=list[AllocationItem])
def latest_allocation(db: Session = Depends(get_db)):
    latest_run_id = db.execute(select(Allocation.run_id).order_by(Allocation.created_at.desc()).limit(1)).scalar_one_or_none()
    if latest_run_id is None:
        return []

    rows = (
        db.execute(select(Allocation).where(Allocation.run_id == latest_run_id).order_by(Allocation.medicine_id, Allocation.district_id))
        .scalars()
        .all()
    )
    return [
        AllocationItem(
            run_id=row.run_id,
            district_id=row.district_id,
            medicine_id=row.medicine_id,
            target_month=row.target_month,
            predicted_demand=row.predicted_demand,
            allocated_quantity=row.allocated_quantity,
            shortage=row.shortage,
        )
        for row in rows
    ]


@app.get("/metrics/summary", response_model=MetricsSummary)
def metrics_summary(db: Session = Depends(get_db)):
    latest_run_id = db.execute(select(Allocation.run_id).order_by(Allocation.created_at.desc()).limit(1)).scalar_one_or_none()
    if latest_run_id is None:
        return MetricsSummary(stock_out_rate=0.0, oversupply_rate=0.0, avg_shortage=0.0, avg_forecast_error=0.0)

    allocations = db.execute(select(Allocation).where(Allocation.run_id == latest_run_id)).scalars().all()
    if not allocations:
        return MetricsSummary(stock_out_rate=0.0, oversupply_rate=0.0, avg_shortage=0.0, avg_forecast_error=0.0)

    stock_out_count = sum(1 for row in allocations if row.shortage > 0)
    oversupply_count = sum(1 for row in allocations if row.allocated_quantity > row.predicted_demand)
    avg_shortage = sum(row.shortage for row in allocations) / len(allocations)

    abs_errors: list[float] = []
    for row in allocations:
        actual_query = db.execute(
            select(func.avg(UsageHistory.quantity_used)).where(
                UsageHistory.district_id == row.district_id,
                UsageHistory.medicine_id == row.medicine_id,
            )
        ).scalar_one_or_none()
        if actual_query is not None:
            abs_errors.append(abs(float(actual_query) - row.predicted_demand))

    avg_forecast_error = sum(abs_errors) / len(abs_errors) if abs_errors else 0.0

    return MetricsSummary(
        stock_out_rate=round(safe_div(stock_out_count, len(allocations)), 4),
        oversupply_rate=round(safe_div(oversupply_count, len(allocations)), 4),
        avg_shortage=round(avg_shortage, 2),
        avg_forecast_error=round(avg_forecast_error, 2),
    )
