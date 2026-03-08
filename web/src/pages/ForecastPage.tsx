import { useState } from "react";
import { api } from "../api";
import type { ForecastResponse } from "../types";

export function ForecastPage() {
  const [districtId, setDistrictId] = useState(1);
  const [medicineId, setMedicineId] = useState(1);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState("");

  async function runForecast() {
    setError("");
    try {
      const response = await api.get<ForecastResponse>("/forecast", {
        params: {
          district_id: districtId,
          medicine_id: medicineId,
          months: 1,
        },
      });
      setForecast(response.data);
    } catch (err: any) {
      setForecast(null);
      setError(err?.response?.data?.detail || err.message);
    }
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Forecast</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          District ID
          <input
            type="number"
            min={1}
            value={districtId}
            onChange={(event) => setDistrictId(Number(event.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Medicine ID
          <input
            type="number"
            min={1}
            value={medicineId}
            onChange={(event) => setMedicineId(Number(event.target.value))}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={runForecast}
            className="rounded-md bg-slate-900 px-4 py-2 text-white"
          >
            Run Forecast
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {forecast && (
        <div className="rounded-md bg-white p-4 shadow-sm">
          <p>
            <strong>District:</strong> {forecast.district_id}
          </p>
          <p>
            <strong>Medicine:</strong> {forecast.medicine_id}
          </p>
          <p>
            <strong>Target Month:</strong> {forecast.target_month}
          </p>
          <p>
            <strong>Predicted Demand:</strong>{" "}
            {forecast.predicted_demand.toFixed(2)}
          </p>
          <p>
            <strong>Model Used:</strong> {forecast.model_used}
          </p>
        </div>
      )}
    </section>
  );
}
