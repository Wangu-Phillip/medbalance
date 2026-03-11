"""
MedBalance AI API - Firestore backend version
Medicine demand forecasting and fair allocation
"""

from __future__ import annotations

import os
import uuid
from collections import defaultdict
from datetime import date

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from firebase_admin import firestore

from .firestore_db import (
    ALLOCATIONS_COLLECTION,
    DISTRICTS_COLLECTION,
    FORECASTS_COLLECTION,
    MEDICINES_COLLECTION,
    STOCK_LEVELS_COLLECTION,
    USAGE_HISTORY_COLLECTION,
    get_db,
)
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


def _persist_payload(payload: DataUploadRequest, db: firestore.Client) -> dict[str, int | str]:
    """
    Persist uploaded data to Firestore.
    Handles districts, medicines, usage history, and stock levels.
    """
    district_map: dict[str, str] = {}  # name -> document_id
    medicine_map: dict[str, str] = {}  # name -> document_id

    # Load existing districts
    try:
        for doc in db.collection(DISTRICTS_COLLECTION).stream():
            district_map[doc.get("name")] = doc.id
    except Exception:
        pass

    # Load existing medicines
    try:
        for doc in db.collection(MEDICINES_COLLECTION).stream():
            medicine_map[doc.get("name")] = doc.id
    except Exception:
        pass

    # Create or update districts
    for district_in in payload.districts:
        if district_in.name not in district_map:
            new_doc = db.collection(DISTRICTS_COLLECTION).add({
                "name": district_in.name,
                "created_at": firestore.SERVER_TIMESTAMP,
            })
            district_map[district_in.name] = new_doc[1].id
        else:
            # Update existing district's timestamp if it hasn't been set
            try:
                db.collection(DISTRICTS_COLLECTION).document(district_map[district_in.name]).update({
                    "created_at": firestore.SERVER_TIMESTAMP,
                })
            except Exception:
                pass

    # Create or update medicines
    for medicine_in in payload.medicines:
        if medicine_in.name not in medicine_map:
            new_doc = db.collection(MEDICINES_COLLECTION).add({
                "name": medicine_in.name,
                "created_at": firestore.SERVER_TIMESTAMP,
            })
            medicine_map[medicine_in.name] = new_doc[1].id
        else:
            # Update existing medicine's timestamp if it hasn't been set
            try:
                db.collection(MEDICINES_COLLECTION).document(medicine_map[medicine_in.name]).update({
                    "created_at": firestore.SERVER_TIMESTAMP,
                })
            except Exception:
                pass

    usage_count = 0
    stock_count = 0

    # Process usage history
    for usage in payload.usage_history:
        district_id = district_map.get(usage.district_name)
        medicine_id = medicine_map.get(usage.medicine_name)
        
        if district_id is None or medicine_id is None:
            raise HTTPException(status_code=400, detail="Unknown district or medicine in usage_history")

        # Check if usage record exists
        existing = db.collection(USAGE_HISTORY_COLLECTION).where(
            filter=firestore.FieldFilter("district_id", "==", district_id)
        ).where(
            filter=firestore.FieldFilter("medicine_id", "==", medicine_id)
        ).where(
            filter=firestore.FieldFilter("month", "==", usage.month.isoformat())
        ).stream()

        existing_doc = None
        for doc in existing:
            existing_doc = doc
            break

        if existing_doc is None:
            db.collection(USAGE_HISTORY_COLLECTION).add({
                "district_id": district_id,
                "medicine_id": medicine_id,
                "month": usage.month.isoformat(),
                "quantity_used": usage.quantity_used,
            })
        else:
            db.collection(USAGE_HISTORY_COLLECTION).document(existing_doc.id).update({
                "quantity_used": usage.quantity_used,
            })
        usage_count += 1

    # Process stock levels
    for stock in payload.stock_levels:
        district_id = district_map.get(stock.district_name)
        medicine_id = medicine_map.get(stock.medicine_name)
        
        if district_id is None or medicine_id is None:
            raise HTTPException(status_code=400, detail="Unknown district or medicine in stock_levels")

        # Check if stock record exists
        existing = db.collection(STOCK_LEVELS_COLLECTION).where(
            filter=firestore.FieldFilter("district_id", "==", district_id)
        ).where(
            filter=firestore.FieldFilter("medicine_id", "==", medicine_id)
        ).where(
            filter=firestore.FieldFilter("as_of_month", "==", stock.as_of_month.isoformat())
        ).stream()

        existing_doc = None
        for doc in existing:
            existing_doc = doc
            break

        if existing_doc is None:
            db.collection(STOCK_LEVELS_COLLECTION).add({
                "district_id": district_id,
                "medicine_id": medicine_id,
                "as_of_month": stock.as_of_month.isoformat(),
                "quantity_in_stock": stock.quantity_in_stock,
            })
        else:
            db.collection(STOCK_LEVELS_COLLECTION).document(existing_doc.id).update({
                "quantity_in_stock": stock.quantity_in_stock,
            })
        stock_count += 1

    return {
        "status": "uploaded",
        "districts": len(payload.districts),
        "medicines": len(payload.medicines),
        "usage_records": usage_count,
        "stock_records": stock_count,
    }


@app.post("/data/upload")
def upload_data(payload: DataUploadRequest, db: firestore.Client = Depends(get_db)) -> dict[str, int | str]:
    return _persist_payload(payload, db)


@app.post("/data/seed")
def seed_data(clear_existing: bool = False, db: firestore.Client = Depends(get_db)) -> dict[str, int | str]:
    if clear_existing:
        # Delete all documents from collections
        for collection_name in [
            ALLOCATIONS_COLLECTION,
            FORECASTS_COLLECTION,
            STOCK_LEVELS_COLLECTION,
            USAGE_HISTORY_COLLECTION,
            MEDICINES_COLLECTION,
            DISTRICTS_COLLECTION,
        ]:
            try:
                docs = db.collection(collection_name).stream()
                for doc in docs:
                    db.collection(collection_name).document(doc.id).delete()
            except Exception:
                pass

    payload = build_sample_payload()
    result = _persist_payload(payload, db)
    return {"status": "seeded", **result}


@app.get("/forecast", response_model=ForecastResponse)
def forecast_demand(
    district_id: str = Query(...),
    medicine_id: str = Query(...),
    months: int = Query(1, ge=1, le=3),
    db: firestore.Client = Depends(get_db),
):
    # Fetch usage history
    history_docs = db.collection(USAGE_HISTORY_COLLECTION).where(
        filter=firestore.FieldFilter("district_id", "==", district_id)
    ).where(
        filter=firestore.FieldFilter("medicine_id", "==", medicine_id)
    ).order_by("month").stream()

    history = []
    for doc in history_docs:
        data = doc.to_dict()
        data["id"] = doc.id
        data["month"] = date.fromisoformat(data["month"])
        history.append(data)

    if not history:
        raise HTTPException(status_code=404, detail="No usage history found for district/medicine pair")

    values = [item["quantity_used"] for item in history]
    forecast_result = forecast_next(values)
    last_month = history[-1]["month"]

    if months == 1:
        # Calculate target month
        if last_month.month == 12:
            target_month = date(last_month.year + 1, 1, 1)
        else:
            target_month = date(last_month.year, last_month.month + 1, 1)

        # Check if forecast exists
        existing = db.collection(FORECASTS_COLLECTION).where(
            filter=firestore.FieldFilter("district_id", "==", district_id)
        ).where(
            filter=firestore.FieldFilter("medicine_id", "==", medicine_id)
        ).where(
            filter=firestore.FieldFilter("target_month", "==", target_month.isoformat())
        ).stream()

        existing_doc = None
        for doc in existing:
            existing_doc = doc
            break

        if existing_doc:
            db.collection(FORECASTS_COLLECTION).document(existing_doc.id).update({
                "predicted_demand": round(forecast_result.prediction, 2),
                "model_used": forecast_result.model_used,
            })
        else:
            db.collection(FORECASTS_COLLECTION).add({
                "district_id": district_id,
                "medicine_id": medicine_id,
                "target_month": target_month.isoformat(),
                "predicted_demand": round(forecast_result.prediction, 2),
                "model_used": forecast_result.model_used,
                "created_at": firestore.SERVER_TIMESTAMP,
            })

        return ForecastResponse(
            district_id=district_id,
            medicine_id=medicine_id,
            target_month=target_month,
            predicted_demand=round(forecast_result.prediction, 2),
            model_used=forecast_result.model_used,
        )

    # For months > 1, just return forecast without persisting
    if last_month.month == 12:
        target_month = date(last_month.year + 1, 1, 1)
    else:
        target_month = date(last_month.year, last_month.month + 1, 1)

    return ForecastResponse(
        district_id=district_id,
        medicine_id=medicine_id,
        target_month=target_month,
        predicted_demand=round(forecast_result.prediction, 2),
        model_used=forecast_result.model_used,
    )


@app.post("/allocation/run", response_model=list[AllocationItem])
def run_allocation(payload: AllocationRunRequest, db: firestore.Client = Depends(get_db)):
    run_id = str(uuid.uuid4())[:8]

    # Fetch all usage history
    usage_docs = db.collection(USAGE_HISTORY_COLLECTION).order_by("month").stream()
    usage_rows = []
    for doc in usage_docs:
        data = doc.to_dict()
        data["id"] = doc.id
        data["month"] = date.fromisoformat(data["month"])
        usage_rows.append(data)

    if not usage_rows:
        raise HTTPException(status_code=400, detail="No usage history loaded")

    # Group usage by (district_id, medicine_id)
    grouped_usage: dict[tuple[str, str], list] = defaultdict(list)
    for row in usage_rows:
        grouped_usage[(row["district_id"], row["medicine_id"])].append(row)

    per_medicine_predictions: dict[str, dict[str, float]] = defaultdict(dict)
    target_month_lookup: dict[tuple[str, str], date] = {}

    # Generate forecasts
    for (district_id, medicine_id), rows in grouped_usage.items():
        values = [row["quantity_used"] for row in rows]
        result = forecast_next(values)
        latest_month = rows[-1]["month"]
        
        if latest_month.month == 12:
            target_month = date(latest_month.year + 1, 1, 1)
        else:
            target_month = date(latest_month.year, latest_month.month + 1, 1)
        
        if payload.target_month:
            target_month = payload.target_month

        per_medicine_predictions[medicine_id][district_id] = round(result.prediction, 2)
        target_month_lookup[(district_id, medicine_id)] = target_month

        # Check if forecast exists
        existing = db.collection(FORECASTS_COLLECTION).where(
            filter=firestore.FieldFilter("district_id", "==", district_id)
        ).where(
            filter=firestore.FieldFilter("medicine_id", "==", medicine_id)
        ).where(
            filter=firestore.FieldFilter("target_month", "==", target_month.isoformat())
        ).stream()

        existing_doc = None
        for doc in existing:
            existing_doc = doc
            break

        if existing_doc:
            db.collection(FORECASTS_COLLECTION).document(existing_doc.id).update({
                "predicted_demand": round(result.prediction, 2),
                "model_used": result.model_used,
            })
        else:
            db.collection(FORECASTS_COLLECTION).add({
                "district_id": district_id,
                "medicine_id": medicine_id,
                "target_month": target_month.isoformat(),
                "predicted_demand": round(result.prediction, 2),
                "model_used": result.model_used,
                "created_at": firestore.SERVER_TIMESTAMP,
            })

    # Fetch stock levels
    stock_docs = db.collection(STOCK_LEVELS_COLLECTION).stream()
    stock_by_medicine: dict[str, float] = defaultdict(float)
    
    for doc in stock_docs:
        data = doc.to_dict()
        stock_by_medicine[data["medicine_id"]] += data["quantity_in_stock"]

    if not stock_by_medicine:
        raise HTTPException(status_code=400, detail="No stock levels loaded")

    # Run allocation algorithm
    allocation_rows: list[dict] = []
    for medicine_id, pred_by_district in per_medicine_predictions.items():
        total_available = stock_by_medicine.get(medicine_id, 0.0)
        alloc_map = allocate_fair_share(pred_by_district, total_available)

        for district_id, pred in pred_by_district.items():
            allocated = alloc_map.get(district_id, 0.0)
            shortage = max(pred - allocated, 0.0)
            
            alloc_data = {
                "run_id": run_id,
                "district_id": district_id,
                "medicine_id": medicine_id,
                "target_month": target_month_lookup[(district_id, medicine_id)].isoformat(),
                "predicted_demand": pred,
                "allocated_quantity": round(allocated, 2),
                "shortage": round(shortage, 2),
                "created_at": firestore.SERVER_TIMESTAMP,
            }
            
            # Add to Firestore
            doc_ref = db.collection(ALLOCATIONS_COLLECTION).add(alloc_data)
            
            # Return allocation item
            allocation_rows.append({
                "id": doc_ref[1].id,
                **alloc_data,
                "target_month": target_month_lookup[(district_id, medicine_id)],
            })

    return [
        AllocationItem(
            run_id=row["run_id"],
            district_id=row["district_id"],
            medicine_id=row["medicine_id"],
            target_month=row["target_month"],
            predicted_demand=row["predicted_demand"],
            allocated_quantity=row["allocated_quantity"],
            shortage=row["shortage"],
        )
        for row in allocation_rows
    ]


@app.get("/allocation/latest", response_model=list[AllocationItem])
def latest_allocation(db: firestore.Client = Depends(get_db)):
    # Find latest run_id
    allocations = db.collection(ALLOCATIONS_COLLECTION).order_by("created_at", direction=firestore.Query.DESCENDING).limit(1).stream()
    
    latest_run_id = None
    for doc in allocations:
        latest_run_id = doc.get("run_id")
        break

    if latest_run_id is None:
        return []

    # Fetch all allocations for latest run
    docs = db.collection(ALLOCATIONS_COLLECTION).where(
        filter=firestore.FieldFilter("run_id", "==", latest_run_id)
    ).order_by("medicine_id").order_by("district_id").stream()

    results = []
    for doc in docs:
        data = doc.to_dict()
        data["target_month"] = date.fromisoformat(data["target_month"])
        results.append(
            AllocationItem(
                run_id=data["run_id"],
                district_id=data["district_id"],
                medicine_id=data["medicine_id"],
                target_month=data["target_month"],
                predicted_demand=data["predicted_demand"],
                allocated_quantity=data["allocated_quantity"],
                shortage=data["shortage"],
            )
        )

    return results


@app.get("/metrics/summary", response_model=MetricsSummary)
def metrics_summary(db: firestore.Client = Depends(get_db)):
    # Find latest run_id
    allocations = db.collection(ALLOCATIONS_COLLECTION).order_by("created_at", direction=firestore.Query.DESCENDING).limit(1).stream()
    
    latest_run_id = None
    for doc in allocations:
        latest_run_id = doc.get("run_id")
        break

    if latest_run_id is None:
        return MetricsSummary(stock_out_rate=0.0, oversupply_rate=0.0, avg_shortage=0.0, avg_forecast_error=0.0)

    # Fetch all allocations for latest run
    docs = db.collection(ALLOCATIONS_COLLECTION).where(
        filter=firestore.FieldFilter("run_id", "==", latest_run_id)
    ).stream()

    allocations_list = []
    for doc in docs:
        data = doc.to_dict()
        data["target_month"] = date.fromisoformat(data["target_month"])
        allocations_list.append(data)

    if not allocations_list:
        return MetricsSummary(stock_out_rate=0.0, oversupply_rate=0.0, avg_shortage=0.0, avg_forecast_error=0.0)

    # Calculate metrics
    stock_out_count = sum(1 for row in allocations_list if row["shortage"] > 0)
    oversupply_count = sum(1 for row in allocations_list if row["allocated_quantity"] > row["predicted_demand"])
    avg_shortage = sum(row["shortage"] for row in allocations_list) / len(allocations_list)

    abs_errors: list[float] = []
    for row in allocations_list:
        # Calculate average actual usage for this district/medicine pair
        history_docs = db.collection(USAGE_HISTORY_COLLECTION).where(
            filter=firestore.FieldFilter("district_id", "==", row["district_id"])
        ).where(
            filter=firestore.FieldFilter("medicine_id", "==", row["medicine_id"])
        ).stream()

        quantities = []
        for hdoc in history_docs:
            quantities.append(hdoc.get("quantity_used"))

        if quantities:
            actual_avg = sum(quantities) / len(quantities)
            abs_errors.append(abs(actual_avg - row["predicted_demand"]))

    avg_forecast_error = sum(abs_errors) / len(abs_errors) if abs_errors else 0.0

    return MetricsSummary(
        stock_out_rate=round(safe_div(stock_out_count, len(allocations_list)), 4),
        oversupply_rate=round(safe_div(oversupply_count, len(allocations_list)), 4),
        avg_shortage=round(avg_shortage, 2),
        avg_forecast_error=round(avg_forecast_error, 2),
    )
