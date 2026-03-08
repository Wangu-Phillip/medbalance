from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class DistrictIn(BaseModel):
    name: str


class MedicineIn(BaseModel):
    name: str


class UsageHistoryIn(BaseModel):
    district_name: str
    medicine_name: str
    month: date
    quantity_used: float = Field(ge=0)


class StockLevelIn(BaseModel):
    district_name: str
    medicine_name: str
    as_of_month: date
    quantity_in_stock: float = Field(ge=0)


class DataUploadRequest(BaseModel):
    districts: list[DistrictIn]
    medicines: list[MedicineIn]
    usage_history: list[UsageHistoryIn]
    stock_levels: list[StockLevelIn]


class ForecastResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    
    district_id: int
    medicine_id: int
    target_month: date
    predicted_demand: float
    model_used: str


class AllocationRunRequest(BaseModel):
    target_month: date | None = None


class AllocationItem(BaseModel):
    run_id: str
    district_id: int
    medicine_id: int
    target_month: date
    predicted_demand: float
    allocated_quantity: float
    shortage: float


class MetricsSummary(BaseModel):
    stock_out_rate: float
    oversupply_rate: float
    avg_shortage: float
    avg_forecast_error: float
