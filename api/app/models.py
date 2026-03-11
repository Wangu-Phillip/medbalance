"""
Firestore document models for MedBalance AI.
Uses Pydantic for validation and serialization.
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class District(BaseModel):
    """District document model."""
    id: Optional[str] = Field(None, description="Firestore document ID")
    name: str = Field(..., min_length=1, max_length=120)
    created_at: Optional[datetime] = None


class Medicine(BaseModel):
    """Medicine document model."""
    id: Optional[str] = Field(None, description="Firestore document ID")
    name: str = Field(..., min_length=1, max_length=120)
    created_at: Optional[datetime] = None


class UsageHistory(BaseModel):
    """Usage history document model."""
    id: Optional[str] = Field(None, description="Firestore document ID")
    district_id: str
    medicine_id: str
    month: date
    quantity_used: float = Field(..., ge=0)


class StockLevel(BaseModel):
    """Stock level document model."""
    id: Optional[str] = Field(None, description="Firestore document ID")
    district_id: str
    medicine_id: str
    as_of_month: date
    quantity_in_stock: float = Field(..., ge=0)


class Forecast(BaseModel):
    """Forecast document model."""
    id: Optional[str] = Field(None, description="Firestore document ID")
    district_id: str
    medicine_id: str
    target_month: date
    predicted_demand: float = Field(..., ge=0)
    model_used: str = Field(..., min_length=1, max_length=50)
    created_at: Optional[datetime] = None


class Allocation(BaseModel):
    """Allocation document model."""
    id: Optional[str] = Field(None, description="Firestore document ID")
    run_id: str
    district_id: str
    medicine_id: str
    target_month: date
    predicted_demand: float = Field(..., ge=0)
    allocated_quantity: float = Field(..., ge=0)
    shortage: float = Field(default=0, ge=0)
    created_at: Optional[datetime] = None
