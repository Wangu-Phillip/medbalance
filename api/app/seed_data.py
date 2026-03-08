from __future__ import annotations

from .schemas import DataUploadRequest, DistrictIn, MedicineIn, StockLevelIn, UsageHistoryIn


def build_sample_payload() -> DataUploadRequest:
    districts = [
        DistrictIn(name="Gaborone"),
        DistrictIn(name="Francistown"),
        DistrictIn(name="Maun"),
        DistrictIn(name="Serowe"),
    ]

    medicines = [
        MedicineIn(name="Amoxicillin"),
        MedicineIn(name="Paracetamol"),
        MedicineIn(name="Metformin"),
    ]

    usage_history = [
        UsageHistoryIn(district_name="Gaborone", medicine_name="Amoxicillin", month="2025-07-01", quantity_used=118),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Amoxicillin", month="2025-08-01", quantity_used=123),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Amoxicillin", month="2025-09-01", quantity_used=129),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Amoxicillin", month="2025-10-01", quantity_used=120),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Amoxicillin", month="2025-11-01", quantity_used=135),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Amoxicillin", month="2025-12-01", quantity_used=128),
        UsageHistoryIn(district_name="Francistown", medicine_name="Amoxicillin", month="2025-07-01", quantity_used=74),
        UsageHistoryIn(district_name="Francistown", medicine_name="Amoxicillin", month="2025-08-01", quantity_used=77),
        UsageHistoryIn(district_name="Francistown", medicine_name="Amoxicillin", month="2025-09-01", quantity_used=82),
        UsageHistoryIn(district_name="Francistown", medicine_name="Amoxicillin", month="2025-10-01", quantity_used=80),
        UsageHistoryIn(district_name="Francistown", medicine_name="Amoxicillin", month="2025-11-01", quantity_used=88),
        UsageHistoryIn(district_name="Francistown", medicine_name="Amoxicillin", month="2025-12-01", quantity_used=92),
        UsageHistoryIn(district_name="Maun", medicine_name="Amoxicillin", month="2025-07-01", quantity_used=46),
        UsageHistoryIn(district_name="Maun", medicine_name="Amoxicillin", month="2025-08-01", quantity_used=49),
        UsageHistoryIn(district_name="Maun", medicine_name="Amoxicillin", month="2025-09-01", quantity_used=53),
        UsageHistoryIn(district_name="Maun", medicine_name="Amoxicillin", month="2025-10-01", quantity_used=50),
        UsageHistoryIn(district_name="Maun", medicine_name="Amoxicillin", month="2025-11-01", quantity_used=56),
        UsageHistoryIn(district_name="Maun", medicine_name="Amoxicillin", month="2025-12-01", quantity_used=60),
        UsageHistoryIn(district_name="Serowe", medicine_name="Amoxicillin", month="2025-07-01", quantity_used=58),
        UsageHistoryIn(district_name="Serowe", medicine_name="Amoxicillin", month="2025-08-01", quantity_used=61),
        UsageHistoryIn(district_name="Serowe", medicine_name="Amoxicillin", month="2025-09-01", quantity_used=67),
        UsageHistoryIn(district_name="Serowe", medicine_name="Amoxicillin", month="2025-10-01", quantity_used=64),
        UsageHistoryIn(district_name="Serowe", medicine_name="Amoxicillin", month="2025-11-01", quantity_used=70),
        UsageHistoryIn(district_name="Serowe", medicine_name="Amoxicillin", month="2025-12-01", quantity_used=73),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Paracetamol", month="2025-10-01", quantity_used=320),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Paracetamol", month="2025-11-01", quantity_used=335),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Paracetamol", month="2025-12-01", quantity_used=341),
        UsageHistoryIn(district_name="Francistown", medicine_name="Paracetamol", month="2025-10-01", quantity_used=210),
        UsageHistoryIn(district_name="Francistown", medicine_name="Paracetamol", month="2025-11-01", quantity_used=218),
        UsageHistoryIn(district_name="Francistown", medicine_name="Paracetamol", month="2025-12-01", quantity_used=226),
        UsageHistoryIn(district_name="Maun", medicine_name="Paracetamol", month="2025-10-01", quantity_used=130),
        UsageHistoryIn(district_name="Maun", medicine_name="Paracetamol", month="2025-11-01", quantity_used=139),
        UsageHistoryIn(district_name="Maun", medicine_name="Paracetamol", month="2025-12-01", quantity_used=144),
        UsageHistoryIn(district_name="Serowe", medicine_name="Paracetamol", month="2025-10-01", quantity_used=160),
        UsageHistoryIn(district_name="Serowe", medicine_name="Paracetamol", month="2025-11-01", quantity_used=171),
        UsageHistoryIn(district_name="Serowe", medicine_name="Paracetamol", month="2025-12-01", quantity_used=177),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Metformin", month="2025-10-01", quantity_used=102),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Metformin", month="2025-11-01", quantity_used=108),
        UsageHistoryIn(district_name="Gaborone", medicine_name="Metformin", month="2025-12-01", quantity_used=114),
        UsageHistoryIn(district_name="Francistown", medicine_name="Metformin", month="2025-10-01", quantity_used=77),
        UsageHistoryIn(district_name="Francistown", medicine_name="Metformin", month="2025-11-01", quantity_used=83),
        UsageHistoryIn(district_name="Francistown", medicine_name="Metformin", month="2025-12-01", quantity_used=86),
        UsageHistoryIn(district_name="Maun", medicine_name="Metformin", month="2025-10-01", quantity_used=52),
        UsageHistoryIn(district_name="Maun", medicine_name="Metformin", month="2025-11-01", quantity_used=57),
        UsageHistoryIn(district_name="Maun", medicine_name="Metformin", month="2025-12-01", quantity_used=61),
        UsageHistoryIn(district_name="Serowe", medicine_name="Metformin", month="2025-10-01", quantity_used=63),
        UsageHistoryIn(district_name="Serowe", medicine_name="Metformin", month="2025-11-01", quantity_used=68),
        UsageHistoryIn(district_name="Serowe", medicine_name="Metformin", month="2025-12-01", quantity_used=72),
    ]

    stock_levels = [
        StockLevelIn(district_name="Gaborone", medicine_name="Amoxicillin", as_of_month="2025-12-01", quantity_in_stock=180),
        StockLevelIn(district_name="Francistown", medicine_name="Amoxicillin", as_of_month="2025-12-01", quantity_in_stock=100),
        StockLevelIn(district_name="Maun", medicine_name="Amoxicillin", as_of_month="2025-12-01", quantity_in_stock=70),
        StockLevelIn(district_name="Serowe", medicine_name="Amoxicillin", as_of_month="2025-12-01", quantity_in_stock=82),
        StockLevelIn(district_name="Gaborone", medicine_name="Paracetamol", as_of_month="2025-12-01", quantity_in_stock=450),
        StockLevelIn(district_name="Francistown", medicine_name="Paracetamol", as_of_month="2025-12-01", quantity_in_stock=280),
        StockLevelIn(district_name="Maun", medicine_name="Paracetamol", as_of_month="2025-12-01", quantity_in_stock=170),
        StockLevelIn(district_name="Serowe", medicine_name="Paracetamol", as_of_month="2025-12-01", quantity_in_stock=200),
        StockLevelIn(district_name="Gaborone", medicine_name="Metformin", as_of_month="2025-12-01", quantity_in_stock=170),
        StockLevelIn(district_name="Francistown", medicine_name="Metformin", as_of_month="2025-12-01", quantity_in_stock=120),
        StockLevelIn(district_name="Maun", medicine_name="Metformin", as_of_month="2025-12-01", quantity_in_stock=90),
        StockLevelIn(district_name="Serowe", medicine_name="Metformin", as_of_month="2025-12-01", quantity_in_stock=95),
    ]

    return DataUploadRequest(
        districts=districts,
        medicines=medicines,
        usage_history=usage_history,
        stock_levels=stock_levels,
    )
