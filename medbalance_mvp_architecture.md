# MedBalance AI — Minimal MVP Architecture and Tech Stack

## 1) Locked Minimal Tech Stack

- **Language**: Python 3.10+
- **Backend/API**: FastAPI, Pydantic, Uvicorn
- **Forecasting/AI**: statsmodels (ARIMA), scikit-learn (Linear Regression baseline)
- **Data Processing**: pandas, numpy
- **Database**: PostgreSQL, SQLAlchemy, Alembic (starter-ready)
- **Frontend**: React + TypeScript + Tailwind CSS + Recharts
- **Dev/Run**: Docker Compose, pytest

## 2) Minimal Architecture (Prototype)

This MVP is a **modular monolith**, not microservices.

- **Web (`web`)**
  - Upload historical usage and stock data
  - View forecasts
  - View allocation recommendations and KPIs
- **API (`api`)**
  - Data ingestion and validation
  - Forecast computation
  - Fair allocation generation
  - Metrics summary
- **Database (`db`)**
  - PostgreSQL stores districts, medicines, usage history, stock levels, forecasts, allocations

## 3) API Scope (5 Core Routes)

- `POST /data/upload`
- `GET /forecast?district_id=&medicine_id=&months=`
- `POST /allocation/run`
- `GET /allocation/latest`
- `GET /metrics/summary`

## 4) MVP Data Scope

- Districts: 3–5
- Medicines: 5–10
- Time horizon: short-term monthly demand forecasting
- Data source: realistic simulated data or available historical data

## 5) Core Database Entities

- `districts`
- `medicines`
- `usage_history`
- `stock_levels`
- `forecasts`
- `allocations`

## 6) Allocation Rule (MVP)

For each medicine `m` and district `d`:

\[
alloc*{d,m} = \min\left(pred*{d,m},\; \frac{pred*{d,m}}{\sum_d pred*{d,m}} \cdot stock_m\right)
\]

**Formula Breakdown:**

| Component           | Meaning                                                      |
| ------------------- | ------------------------------------------------------------ |
| $alloc_{d,m}$       | Amount of medicine $m$ allocated to district $d$             |
| $pred_{d,m}$        | Predicted demand for medicine $m$ in district $d$            |
| $\sum_d pred_{d,m}$ | Total predicted demand across all districts for medicine $m$ |
| $stock_m$           | Total available stock of medicine $m$                        |

**Logic:** The allocation takes the _minimum_ of two values:

- **Left side** ($pred_{d,m}$): What the district needs
- **Right side** ($\frac{pred_{d,m}}{\sum_d pred_{d,m}} \cdot stock_m$): The district's fair-share proportion of total available stock

This ensures fair rationing when stock is insufficient to meet all demand.

**Example:**
If Paracetamol stock = 800 units, District A needs 400, District B needs 600:

- District A: $\min(400, \frac{400}{1000} \cdot 800) = 320$ units (shortage of 80)
- District B: $\min(600, \frac{600}{1000} \cdot 800) = 480$ units (shortage of 120)

Then distribute any remaining stock to districts with unmet demand.

## 7) 6-Week Delivery Plan

- **Week 1**: Project setup, schema, seed/simulated data
- **Week 2**: Data upload and validation flow
- **Week 3**: Baseline forecasting (moving average + linear regression)
- **Week 4**: ARIMA integration and model selection
- **Week 5**: Allocation engine + metrics
- **Week 6**: React dashboard + end-to-end testing + report outputs

## 8) Non-Goals (Explicitly Out of Scope)

- Nationwide production rollout
- Full pharmaceutical catalog
- Real-time integration with government systems
- Large-scale distributed AI infrastructure
