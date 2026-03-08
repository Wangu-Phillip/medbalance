from __future__ import annotations

import argparse
import json
import os

import httpx

from app.seed_data import build_sample_payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed MedBalance API with sample data")
    parser.add_argument("--api-url", default=os.getenv("API_URL", "http://localhost:8000"))
    parser.add_argument("--clear-existing", action="store_true")
    args = parser.parse_args()

    payload = build_sample_payload().model_dump(mode="json")

    seed_url = f"{args.api_url.rstrip('/')}/data/seed"
    upload_url = f"{args.api_url.rstrip('/')}/data/upload"

    with httpx.Client(timeout=30.0) as client:
        response = client.post(seed_url, params={"clear_existing": args.clear_existing})
        if response.status_code == 404:
            response = client.post(upload_url, json=payload)

    print(f"Status: {response.status_code}")
    try:
        print(json.dumps(response.json(), indent=2))
    except Exception:
        print(response.text)


if __name__ == "__main__":
    main()
