import { useState } from "react";
import { UploadPage } from "./pages/UploadPage";
import { ForecastPage } from "./pages/ForecastPage.tsx";
import { AllocationPage } from "./pages/AllocationPage.tsx";

type TabKey = "upload" | "forecast" | "allocation";

export default function App() {
  const [tab, setTab] = useState<TabKey>("upload");

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <h1 className="text-xl font-semibold">MedBalance AI (MVP)</h1>
          <p className="text-sm text-slate-600">
            Medicine demand forecasting and fair allocation prototype
          </p>
          <nav className="mt-4 flex gap-2">
            <button
              onClick={() => setTab("upload")}
              className={`rounded-md px-3 py-2 text-sm ${tab === "upload" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
            >
              Upload Data
            </button>
            <button
              onClick={() => setTab("forecast")}
              className={`rounded-md px-3 py-2 text-sm ${tab === "forecast" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
            >
              Forecast
            </button>
            <button
              onClick={() => setTab("allocation")}
              className={`rounded-md px-3 py-2 text-sm ${tab === "allocation" ? "bg-slate-900 text-white" : "bg-slate-200"}`}
            >
              Allocation & Metrics
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "upload" && <UploadPage />}
        {tab === "forecast" && <ForecastPage />}
        {tab === "allocation" && <AllocationPage />}
      </main>
    </div>
  );
}
