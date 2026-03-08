# MedBalance AI (MVP)

Minimal prototype for forecasting medicine demand and generating fair allocation recommendations across selected districts.

## Stack

- Backend: FastAPI + SQLAlchemy + PostgreSQL
- AI/Forecasting: statsmodels + scikit-learn
- Frontend: React + Tailwind + Recharts
- Orchestration: Docker Compose

## Quick Start (Docker)

1. Copy env file:
   - `copy .env.example .env`
2. Start services:
   - `docker compose up --build`
3. Open:
   - API docs: `http://localhost:8000/docs`
   - Web app: `http://localhost:5173`

## Services

- `db`: PostgreSQL (`localhost:5432`)
- `api`: FastAPI (`localhost:8000`)
- `web`: React/Vite (`localhost:5173`)

## API Routes

- `POST /data/upload`
- `POST /data/seed`
- `GET /forecast`
- `POST /allocation/run`
- `GET /allocation/latest`
- `GET /metrics/summary`

## Quick Demo Seed

- One-click from UI: open `Upload Data` tab and click `Load Sample Data`
- Script-based seed:
  - `cd api`
  - `python scripts/seed_sample_data.py --api-url http://localhost:8000`
  - Optional reset-first: `python scripts/seed_sample_data.py --clear-existing`
