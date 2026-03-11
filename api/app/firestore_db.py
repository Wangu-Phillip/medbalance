"""
Firestore database initialization and connection manager.
Replaces SQLAlchemy PostgreSQL setup with Firestore.
"""

import json
import os

import firebase_admin
from firebase_admin import credentials, firestore


# Initialize Firebase Admin SDK
def _init_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    try:
        # Check if app is already initialized
        firebase_admin.get_app()
        return
    except ValueError:
        # App not initialized, proceed with initialization
        pass

    # Try to load credentials from environment variable (JSON string)
    creds_json = os.getenv("FIREBASE_CREDENTIALS_JSON")
    
    if creds_json:
        try:
            creds_dict = json.loads(creds_json)
            cred = credentials.Certificate(creds_dict)
            firebase_admin.initialize_app(cred)
            return
        except Exception as e:
            raise ValueError(f"Failed to initialize Firebase with FIREBASE_CREDENTIALS_JSON: {e}")
    
    # Fall back to default credentials (GOOGLE_APPLICATION_CREDENTIALS environment variable)
    google_app_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if google_app_creds and os.path.exists(google_app_creds):
        try:
            cred = credentials.Certificate(google_app_creds)
            firebase_admin.initialize_app(cred)
            return
        except Exception as e:
            raise ValueError(f"Failed to initialize Firebase with GOOGLE_APPLICATION_CREDENTIALS: {e}")
    
    # Last resort: try to use default application credentials
    try:
        firebase_admin.initialize_app()
        return
    except Exception as e:
        raise ValueError(
            f"Could not initialize Firebase. Please set FIREBASE_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS environment variable. Error: {e}"
        )


_init_firebase()

# Get Firestore client
db = firestore.client()


# Collection names
DISTRICTS_COLLECTION = "districts"
MEDICINES_COLLECTION = "medicines"
USAGE_HISTORY_COLLECTION = "usage_history"
STOCK_LEVELS_COLLECTION = "stock_levels"
FORECASTS_COLLECTION = "forecasts"
ALLOCATIONS_COLLECTION = "allocations"


def get_db():
    """
    Dependency injection for Firestore client.
    Maintains compatibility with FastAPI dependency injection pattern.
    """
    return db
