# MedBalance AI — End-to-End Setup and Execution Guide

This guide covers full setup from scratch: Docker, PostgreSQL, project install, running services, seeding data, and using the app.

## 1) Project Overview

MedBalance AI is a 3-service stack:

- **DB**: PostgreSQL
- **API**: FastAPI + SQLAlchemy
- **Web**: React + Vite + Tailwind

Primary orchestration is in `docker-compose.yml`.
Backend entrypoint is `api/app/main.py`.
Frontend entrypoint is `web/src/main.tsx`.

---

## 2) Prerequisites (from zero)

### 2.1 Install Git

- Download and install Git: https://git-scm.com/downloads
- Verify:

```bash
git --version
```

### 2.2 Install Docker Desktop

- Install Docker Desktop: https://www.docker.com/products/docker-desktop/
- Start Docker Desktop and wait until it reports running.
- Verify:

```bash
docker --version
docker compose version
```

### 2.3 (Optional) Install local PostgreSQL

Not required for normal project execution because PostgreSQL runs in Docker via `docker-compose.yml`.
If needed for local DB management tools:

- Download: https://www.postgresql.org/download/
- Keep default port `5432` unless already used.

### 2.4 Install Python (only if running helper script locally)

- Install Python 3.10+ (3.11 recommended): https://www.python.org/downloads/
- Verify:

```bash
python --version
```

---

## 3) Get the project ready

### 3.1 Clone and enter project

```bash
git clone <your-repo-url>
cd medbalance_ai
```

### 3.2 Create environment file

Copy `.env.example` to `.env`:

Windows (PowerShell):

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Default values already work for Docker setup:

- `POSTGRES_DB=medbalance`
- `POSTGRES_USER=medbalance`
- `POSTGRES_PASSWORD=medbalance`
- `DATABASE_URL=postgresql+psycopg://medbalance:medbalance@db:5432/medbalance`
- `VITE_API_BASE_URL=http://localhost:8000`

Reference: `.env.example`

---

## 4) Start full stack (DB + API + Web)

From project root:

```bash
docker compose up --build
```

This builds and starts:

- `medbalance-db` (Postgres) from `docker-compose.yml`
- `medbalance-api` from `api/Dockerfile`
- `medbalance-web` from `web/Dockerfile`

Open:

- Web app: `http://localhost:5173`
- API docs: `http://localhost:8000/docs`
- API health: `http://localhost:8000/health`

Health route implementation: `app.main.health` in `api/app/main.py`.

---

## 5) PostgreSQL setup details

No manual SQL setup is required for normal run:

- DB container starts automatically.
- Tables are auto-created by:
  - `Base.metadata.create_all` in `api/app/main.py`
  - Models in `api/app/models.py`
- DB connection config is in `api/app/db.py`.

To inspect DB from host (optional), use:

- Host: `localhost`
- Port: `5432`
- DB/User/Password from `.env`

---

## 6) Load data (seed and upload)

### 6.1 Via Web UI (recommended)

1. Open `http://localhost:5173`
2. Go to **Upload Data** tab
3. Click **Load Sample Data**

Frontend action is in `web/src/pages/UploadPage.tsx`, calling route `app.main.seed_data` in `api/app/main.py`.

### 6.2 Via script

From project root:

```bash
cd api
python scripts/seed_sample_data.py --api-url http://localhost:8000
```

Optional reset-first:

```bash
python scripts/seed_sample_data.py --api-url http://localhost:8000 --clear-existing
```

Script: `api/scripts/seed_sample_data.py`
Seed payload builder: `app.seed_data.build_sample_payload` in `api/app/seed_data.py`.

### 6.3 Via manual upload API

Route: `app.main.upload_data` in `api/app/main.py`
Schema: `app.schemas.DataUploadRequest` in `api/app/schemas.py`

---

## 7) Run core workflows

### 7.1 Forecast

- UI tab: **Forecast**
- API route: `app.main.forecast_demand` in `api/app/main.py`
- Forecast logic: `app.services.forecast.forecast_next` in `api/app/services/forecast.py`

### 7.2 Allocation

- UI tab: **Allocation & Metrics**
- Run allocation route: `app.main.run_allocation` in `api/app/main.py`
- Latest allocation route: `app.main.latest_allocation` in `api/app/main.py`
- Allocation logic: `app.services.allocation.allocate_fair_share` in `api/app/services/allocation.py`

### 7.3 Metrics

- Summary route: `app.main.metrics_summary` in `api/app/main.py`
- Utility: `app.services.metrics.safe_div` in `api/app/services/metrics.py`

---

## 8) API route map

Implemented in `api/app/main.py`:

- `GET /health` → `app.main.health`
- `POST /data/upload` → `app.main.upload_data`
- `POST /data/seed` → `app.main.seed_data`
- `GET /forecast` → `app.main.forecast_demand`
- `POST /allocation/run` → `app.main.run_allocation`
- `GET /allocation/latest` → `app.main.latest_allocation`
- `GET /metrics/summary` → `app.main.metrics_summary`

---

## 9) Frontend structure

- API client: `web/src/api.ts`
- Main app shell/tabs: `web/src/App.tsx`
- Upload page: `web/src/pages/UploadPage.tsx`
- Forecast page: `web/src/pages/ForecastPage.tsx`
- Allocation page: `web/src/pages/AllocationPage.tsx`
- Shared types: `web/src/types.ts`

---

## 10) Stop, restart, cleanup

Stop services:

```bash
docker compose down
```

Stop and remove volumes (deletes DB data):

```bash
docker compose down -v
```

Rebuild clean:

```bash
docker compose build --no-cache
docker compose up
```

---

## 11) Common issues and fixes

- **Port 5432 already in use**
  Stop local Postgres service or change DB port mapping in `docker-compose.yml`.

- **Port 8000 or 5173 already in use**
  Change mapped ports in `docker-compose.yml`.

- **Web cannot reach API**
  Confirm `VITE_API_BASE_URL` in `.env.example` / `.env` and CORS in `docker-compose.yml`.

- **No data for forecast/allocation**
  Run seed first using UI or script.

- **Container build issues**
  Rebuild with `--no-cache` and ensure Docker Desktop is running.

---

## 12) Optional: run services without Docker

### API

```bash
cd api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Web

```bash
cd web
npm install
npm run dev
```

Use local PostgreSQL and ensure `DATABASE_URL` in environment matches `api/app/db.py` expectations.

---

## 13) Reference docs in repo

- Main readme: `README.md`
- Architecture notes: `medbalance_mvp_architecture.md`
- Backend dependencies: `api/requirements.txt`
- Frontend dependencies/scripts: `web/package.json`
