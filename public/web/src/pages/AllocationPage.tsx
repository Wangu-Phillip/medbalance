import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import type { AllocationItem, MetricsSummary } from "../types";

export function AllocationPage() {
  const [rows, setRows] = useState<AllocationItem[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [error, setError] = useState("");

  async function runAllocation() {
    setError("");
    try {
      await api.post("/allocation/run", {});
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message);
    }
  }

  async function refresh() {
    const [allocationRes, metricsRes] = await Promise.all([
      api.get<AllocationItem[]>("/allocation/latest"),
      api.get<MetricsSummary>("/metrics/summary"),
    ]);
    setRows(allocationRes.data);
    setMetrics(metricsRes.data);
  }

  useEffect(() => {
    refresh().catch((err: any) =>
      setError(err?.response?.data?.detail || err.message),
    );
  }, []);

  const chartData = rows.map((item) => ({
    name: `D${item.district_id}-M${item.medicine_id}`,
    demand: item.predicted_demand,
    allocated: item.allocated_quantity,
    shortage: item.shortage,
  }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Allocation & Metrics</h2>
      <div className="flex gap-2">
        <button
          onClick={runAllocation}
          className="rounded-md bg-slate-900 px-4 py-2 text-white"
        >
          Run Allocation
        </button>
        <button
          onClick={() => refresh()}
          className="rounded-md bg-slate-200 px-4 py-2 text-slate-900"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card
            title="Stock-out Rate"
            value={`${(metrics.stock_out_rate * 100).toFixed(1)}%`}
          />
          <Card
            title="Oversupply Rate"
            value={`${(metrics.oversupply_rate * 100).toFixed(1)}%`}
          />
          <Card title="Avg Shortage" value={metrics.avg_shortage.toFixed(2)} />
          <Card
            title="Avg Forecast Error"
            value={metrics.avg_forecast_error.toFixed(2)}
          />
        </div>
      )}

      <div className="h-80 rounded-md bg-white p-3 shadow-sm">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="demand" fill="#475569" />
            <Bar dataKey="allocated" fill="#0f766e" />
            <Bar dataKey="shortage" fill="#dc2626" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{title}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  );
}
