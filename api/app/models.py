from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class District(Base):
    __tablename__ = "districts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)


class UsageHistory(Base):
    __tablename__ = "usage_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    month: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_used: Mapped[float] = mapped_column(Float, nullable=False)

    district = relationship("District")
    medicine = relationship("Medicine")

    __table_args__ = (
        UniqueConstraint("district_id", "medicine_id", "month", name="uq_usage_triplet"),
    )


class StockLevel(Base):
    __tablename__ = "stock_levels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    as_of_month: Mapped[date] = mapped_column(Date, nullable=False)
    quantity_in_stock: Mapped[float] = mapped_column(Float, nullable=False)

    district = relationship("District")
    medicine = relationship("Medicine")

    __table_args__ = (
        UniqueConstraint("district_id", "medicine_id", "as_of_month", name="uq_stock_triplet"),
    )


class Forecast(Base):
    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    target_month: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_demand: Mapped[float] = mapped_column(Float, nullable=False)
    model_used: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("district_id", "medicine_id", "target_month", name="uq_forecast_triplet"),
    )


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[str] = mapped_column(String(40), index=True, nullable=False)
    district_id: Mapped[int] = mapped_column(ForeignKey("districts.id"), nullable=False)
    medicine_id: Mapped[int] = mapped_column(ForeignKey("medicines.id"), nullable=False)
    target_month: Mapped[date] = mapped_column(Date, nullable=False)
    predicted_demand: Mapped[float] = mapped_column(Float, nullable=False)
    allocated_quantity: Mapped[float] = mapped_column(Float, nullable=False)
    shortage: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
