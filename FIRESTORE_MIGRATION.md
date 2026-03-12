# Firebase Firestore Backend Setup

## Overview

Your MedBalance AI application is now powered by Google Cloud Firestore for all data persistence. This document provides setup instructions and technical details.

---

## Architecture Changes

### Database Layer Updated

#### `api/app/firestore_db.py` (New)

- Firebase Admin SDK initialization
- Firestore client management
- Collection name exports for dependency injection

#### `api/app/models.py`

- Converted from SQLAlchemy ORM to Pydantic models
- Models compatible with Firestore's document structure:
  - `District` - name, created_at
  - `Medicine` - name, created_at
  - `UsageHistory` - district_id, medicine_id, month, quantity_used
  - `StockLevel` - district_id, medicine_id, as_of_month, quantity_in_stock
  - `Forecast` - district_id, medicine_id, target_month, predicted_demand, model_used, created_at
  - `Allocation` - run_id, district_id, medicine_id, target_month, predicted_demand, allocated_quantity, shortage, created_at

#### `api/app/main.py`

- Complete rewrite using Firestore SDK
- All database operations migrated to Firestore query syntax
- 6 API endpoints fully functional:
  - `POST /data/upload` - Upload districts, medicines, usage history, stock levels
  - `POST /data/seed` - Seed sample data
  - `GET /forecast` - Generate demand forecasts
  - `POST /allocation/run` - Run fair allocation algorithm
  - `GET /allocation/latest` - Retrieve latest allocation results
  - `GET /metrics/summary` - Calculate allocation metrics

#### `api/app/services/allocation.py`

- Updated type hints to support Firestore string-based document IDs

#### `api/requirements.txt`

- Added: `firebase-admin==6.4.0`
- Removed legacy database dependencies

### Unchanged Files

- `api/app/schemas.py` - Pydantic schemas (database-agnostic)
- `api/app/seed_data.py` - Sample data generation
- `api/app/services/forecast.py` - ML/forecasting logic
- `api/app/services/metrics.py` - Metrics calculation
- Web frontend - All API contracts remain unchanged

---

## Firestore Collection Structure

Your data is now organized in Firestore with the following collections:

```
firestore_project/
├── districts/
│   ├── {doc_id}
│   │   ├── name: string
│   │   └── created_at: timestamp
│   └── ...
├── medicines/
│   ├── {doc_id}
│   │   ├── name: string
│   │   └── created_at: timestamp
│   └── ...
├── usage_history/
│   ├── {doc_id}
│   │   ├── district_id: string (document ID)
│   │   ├── medicine_id: string (document ID)
│   │   ├── month: string (ISO format: YYYY-MM-DD)
│   │   └── quantity_used: number
│   └── ...
├── stock_levels/
│   ├── {doc_id}
│   │   ├── district_id: string
│   │   ├── medicine_id: string
│   │   ├── as_of_month: string (ISO format)
│   │   └── quantity_in_stock: number
│   └── ...
├── forecasts/
│   ├── {doc_id}
│   │   ├── district_id: string
│   │   ├── medicine_id: string
│   │   ├── target_month: string (ISO format)
│   │   ├── predicted_demand: number
│   │   ├── model_used: string
│   │   └── created_at: timestamp
│   └── ...
└── allocations/
    ├── {doc_id}
    │   ├── run_id: string
    │   ├── district_id: string
    │   ├── medicine_id: string
    │   ├── target_month: string (ISO format)
    │   ├── predicted_demand: number
    │   ├── allocated_quantity: number
    │   ├── shortage: number
    │   └── created_at: timestamp
    └── ...
```

**Note:** IDs changed from auto-incrementing integers to Firestore's auto-generated document IDs (strings).

---

## Setup Instructions

### Prerequisites

1. Google Cloud Project with Firestore enabled
2. Firebase Admin credentials (service account key)
3. Python 3.11+ and Node.js 16+ installed locally

### Step 1: Generate Firebase Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to: **IAM & Admin → Service Accounts**
4. Click **"Create Service Account"**
5. Fill in the service account details and click **"Create and Continue"**
6. Grant the following roles:
   - **Editor** (or more restrictive: **Cloud Datastore User** + **Cloud Datastore Administrator**)
7. Click **"Continue"** → **"Done"**
8. Click on the service account you just created
9. Go to the **"Keys"** tab
10. Click **"Add Key"** → **"Create new key"**
11. Choose **"JSON"** format
12. Click **"Create"** - this downloads your `service-account-key.json` file

### Step 2: Configure Firebase Credentials

Set the Firebase credentials as an environment variable:

**Option A: Using JSON string (quick testing)**

```bash
# Get the contents of service-account-key.json and set as env var
# On bash/zsh:
export FIREBASE_CREDENTIALS_JSON='<paste-entire-json-file-contents-here>'

# On Windows PowerShell:
$env:FIREBASE_CREDENTIALS_JSON='<paste-entire-json-file-contents-here>'
```

**Option B: Using file path (recommended for development)**

```bash
# On bash/zsh:
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json

# On Windows PowerShell:
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\path\to\service-account-key.json'
```

### Step 3: Install Backend Dependencies

```bash
cd api
pip install -r requirements.txt
```

### Step 4: Run the API Server

```bash
# Start API (runs on http://localhost:8000)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 5: Install Frontend Dependencies (in another terminal)

```bash
cd web
npm install
```

### Step 6: Run the Web Frontend

```bash
# Start web frontend (runs on http://localhost:5173)
npm run dev
```

Your application is now running:

- **API:** http://localhost:8000
- **Web UI:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs (Swagger)

---

## API Reference

The API operates with Firestore document IDs:

```
GET /forecast?district_id={document_id}&medicine_id={document_id}
POST /allocation/run with body: {"target_month": "2025-01-01"}
GET /allocation/latest
GET /metrics/summary
POST /data/upload
POST /data/seed?clear_existing=true
```

**Note:** Document IDs are auto-generated Firestore strings (e.g., `KzJ9mK0xL8pQ2vR4`)

---

## Troubleshooting

### Firebase Initialization Error

**Error:** "Could not initialize Firebase. Please set FIREBASE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS"

**Solution:**

- Ensure your service account key has the correct permissions
- Verify the `GOOGLE_APPLICATION_CREDENTIALS` or `FIREBASE_CREDENTIALS_JSON` environment variable is set
- Check that the JSON file is properly formatted and accessible
- Verify the Firestore database is enabled in your Google Cloud project

### API Connection Issues

**Error:** "Connection refused" or "Failed to connect to localhost:8000"

**Solution:**

- Ensure the API server is running: `uvicorn app.main:app --reload`
- Check that port 8000 is not in use by another process
- On Windows, you may need to allow the app through your firewall

### Query Errors

**Error:** "FieldFilter requires a field path"

**Solution:**

- Ensure the field name matches exactly (case-sensitive)
- Check that documents in the collection have the expected fields

### Document ID Type Mismatch

**Error:** "TypeError: argument should be a dict"

**Solution:**

- This typically means a Firestore operation received the wrong document ID type
- Ensure all IDs are strings (Firestore document IDs)

---

## Testing Your Setup

1. **Ensure Firebase credentials are set:**

   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS  # or FIREBASE_CREDENTIALS_JSON
   ```

2. **Start the API server:**

   ```bash
   cd api
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Upload Sample Data (in another terminal):**

   ```bash
   curl -X POST http://localhost:8000/data/seed
   ```

4. **Check Firestore Console:**
   - Go to [Firestore Console](https://console.firebase.google.com/)
   - Select your project and database
   - Verify data appears in the 6 collections: districts, medicines, usage_history, stock_levels, forecasts, allocations

5. **Test Forecast Endpoint:**

   ```bash
   # Get a district ID and medicine ID from Firestore console, then:
   curl "http://localhost:8000/forecast?district_id={doc_id}&medicine_id={doc_id}"
   ```

6. **Run Allocation Algorithm:**

   ```bash
   curl -X POST http://localhost:8000/allocation/run \
     -H "Content-Type: application/json" \
     -d '{"target_month": null}'
   ```

7. **View Metrics:**
   ```bash
   curl http://localhost:8000/metrics/summary
   ```

---

## Backup and Safety

### Firestore Automatic Backups

- Set up automated backups in Google Cloud:
  - Navigate to Firestore → Backups
  - Create a backup schedule (daily recommended)

### Export Data

```bash
# Export your Firestore database
gcloud firestore export gs://your-bucket/backup_name \
  --project=your-project-id
```

---

## Performance Characteristics

### Firestore Advantages

- ✅ Serverless - no database maintenance required
- ✅ Automatic scaling - handles traffic spikes automatically
- ✅ Real-time capabilities - supports live document listeners
- ✅ Global distribution - data replicated across regions
- ✅ No connection pools needed - HTTP/gRPC API

### Considerations

- ⚠️ Costs scale with reads/writes - monitor usage in Google Cloud Console
- ⚠️ Query limitations - composite queries may need indexes
- ⚠️ Transaction limits - max 500 writes per transaction
- ⚠️ Field constraints - documents and strings have size limits

### Optimizations Implemented

- Grouped queries by field filters for efficiency
- Used `.stream()` for efficient large result set handling
- Direct document ID lookups to minimize queries
- ISO format string dates for consistency

---

## Next Steps

1. **Monitor Costs:** Set up billing alerts in Google Cloud Console
2. **Set Up Indexes:** Firestore may suggest composite indexes - create them for performance
3. **Enable Backups:** Configure automated backups for disaster recovery
4. **Consider Real-time Features:** Firestore supports live document listeners for future features

---

## Support & Documentation

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Admin Python SDK](https://firebase.google.com/docs/database/admin/start)
- [Firestore Query Guide](https://firebase.google.com/docs/firestore/query-data/queries)
- [Google Cloud Pricing](https://cloud.google.com/firestore/pricing)

---

**Setup complete! 🎉**

Your application is powered by Firebase Firestore.
