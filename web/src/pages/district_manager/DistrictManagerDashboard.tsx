import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";

interface StockLevel {
  medicine: string;
  current: number;
  predicted: number;
  recommended: number;
}

interface AllocationRecommendation {
  id: string;
  medicine: string;
  currentStock: number;
  predictedDemand: number;
  recommendedAllocation: number;
  urgency: "critical" | "high" | "medium" | "low";
}

export default function DistrictManagerDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "overview" | "forecast" | "allocation" | "analytics" | "reports"
  >("overview");
  const [district] = useState("Central District");
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setLoggingOut(false);
    }
  };

  const demandForecastData = [
    { month: "Jan", demand: 4000, forecast: 4200 },
    { month: "Feb", demand: 3500, forecast: 3800 },
    { month: "Mar", demand: 4200, forecast: 4500 },
    { month: "Apr", demand: 4100, forecast: 4300 },
    { month: "May", demand: 4800, forecast: 5000 },
    { month: "Jun", demand: 5200, forecast: 5400 },
  ];

  const stockLevels: StockLevel[] = [
    {
      medicine: "Paracetamol",
      current: 2500,
      predicted: 3200,
      recommended: 3500,
    },
    {
      medicine: "Amoxicillin",
      current: 800,
      predicted: 1200,
      recommended: 1500,
    },
    {
      medicine: "Ibuprofen",
      current: 1800,
      predicted: 2100,
      recommended: 2500,
    },
    {
      medicine: "Metformin",
      current: 1200,
      predicted: 1800,
      recommended: 2000,
    },
  ];

  const allocations: AllocationRecommendation[] = [
    {
      id: "1",
      medicine: "Amoxicillin",
      currentStock: 800,
      predictedDemand: 1200,
      recommendedAllocation: 500,
      urgency: "critical",
    },
    {
      id: "2",
      medicine: "Metformin",
      currentStock: 1200,
      predictedDemand: 1800,
      recommendedAllocation: 700,
      urgency: "high",
    },
    {
      id: "3",
      medicine: "Paracetamol",
      currentStock: 2500,
      predictedDemand: 3200,
      recommendedAllocation: 800,
      urgency: "medium",
    },
    {
      id: "4",
      medicine: "Ibuprofen",
      currentStock: 1800,
      predictedDemand: 2100,
      recommendedAllocation: 400,
      urgency: "low",
    },
  ];

  const comparisonData = [
    {
      medicine: "Paracetamol",
      demand: 3200,
      supply: 2500,
      gap: 700,
    },
    {
      medicine: "Amoxicillin",
      demand: 1200,
      supply: 800,
      gap: 400,
    },
    {
      medicine: "Ibuprofen",
      demand: 2100,
      supply: 1800,
      gap: 300,
    },
    {
      medicine: "Metformin",
      demand: 1800,
      supply: 1200,
      gap: 600,
    },
  ];

  const stockTrendData = [
    { week: "W1", stock: 2100, usage: 1800 },
    { week: "W2", stock: 2300, usage: 2000 },
    { week: "W3", stock: 2500, usage: 2200 },
    { week: "W4", stock: 2800, usage: 2400 },
    { week: "W5", stock: 3000, usage: 2600 },
  ];

  const getUrgencyColor = (urgency: "critical" | "high" | "medium" | "low") => {
    switch (urgency) {
      case "critical":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "low":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    }
  };

  const handleExportPDF = () => {
    alert(
      `Exporting allocation report for ${district}...\nThis would generate a PDF with allocation recommendations, demand forecasts, and comparative analysis.`,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/10 bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              District Manager Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">{district}</p>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 rounded-lg border border-red-500/20 text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-cyan-500/10 bg-slate-800/50 backdrop-blur-sm px-6">
        <div className="max-w-7xl mx-auto flex gap-8 overflow-x-auto">
          {[
            { key: "overview", label: "Overview" },
            { key: "forecast", label: "Demand Forecast" },
            { key: "allocation", label: "Allocations" },
            { key: "analytics", label: "Analytics" },
            { key: "reports", label: "Reports" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as
                    | "overview"
                    | "forecast"
                    | "allocation"
                    | "analytics"
                    | "reports",
                )
              }
              className={`py-4 px-2 border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Total Stock Value
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  ${(6300 * 15).toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  6,300 units in stock
                </p>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Average Demand/Month
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  4,350 units
                </div>
                <p className="text-xs text-slate-500 mt-2">Forecasted</p>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Critical Items
                </div>
                <div className="text-3xl font-bold text-red-400">2</div>
                <p className="text-xs text-slate-500 mt-2">
                  Urgent attention needed
                </p>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Forecast Accuracy
                </div>
                <div className="text-3xl font-bold text-cyan-400">92%</div>
                <p className="text-xs text-slate-500 mt-2">Last 3 months</p>
              </div>
            </div>

            {/* Current Stock Status */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">
                Current Stock Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stockLevels.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10"
                  >
                    <p className="font-semibold text-cyan-400">
                      {item.medicine}
                    </p>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current:</span>
                        <span className="text-slate-200">
                          {item.current.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Predicted:</span>
                        <span className="text-slate-200">
                          {item.predicted.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recommended:</span>
                        <span className="text-emerald-400">
                          {item.recommended.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Allocations */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">
                Latest Recommendations
              </h3>
              <div className="space-y-3">
                {allocations.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10 flex justify-between items-center"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-cyan-400">
                        {item.medicine}
                      </p>
                      <p className="text-sm text-slate-400">
                        Allocate: {item.recommendedAllocation} units
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${getUrgencyColor(
                        item.urgency,
                      )}`}
                    >
                      {item.urgency.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Demand Forecast Tab */}
        {activeTab === "forecast" && (
          <div className="space-y-6">
            {/* Forecast Chart */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">
                6-Month Demand Forecast
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={demandForecastData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(6, 182, 212, 0.1)"
                  />
                  <XAxis dataKey="month" stroke="rgba(148, 163, 184, 0.6)" />
                  <YAxis stroke="rgba(148, 163, 184, 0.6)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="demand"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    dot={{ fill: "#14B8A6" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: "#06B6D4" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Forecast Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Forecast Metrics</h3>
                <div className="space-y-4">
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-400 text-sm">
                      Mean Absolute Error
                    </p>
                    <p className="text-xl font-semibold text-cyan-400">3.2%</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-400 text-sm">
                      Root Mean Square Error
                    </p>
                    <p className="text-xl font-semibold text-cyan-400">4.1%</p>
                  </div>
                  <div className="p-3 bg-slate-900/50 rounded-lg">
                    <p className="text-slate-400 text-sm">
                      Forecast Confidence
                    </p>
                    <p className="text-xl font-semibold text-emerald-400">
                      94.6%
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Seasonal Factors</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Peak Season</span>
                    <span className="text-cyan-400 font-semibold">
                      May - Jul
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Low Season</span>
                    <span className="text-cyan-400 font-semibold">
                      Dec - Feb
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Trend</span>
                    <span className="text-emerald-400 font-semibold">
                      ↑ Increasing
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Volatility</span>
                    <span className="text-cyan-400 font-semibold">Medium</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Allocations Tab */}
        {activeTab === "allocation" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Allocation Recommendations
              </h3>
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all"
              >
                Export Report (PDF)
              </button>
            </div>

            <div className="space-y-3">
              {allocations.map((item) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${getUrgencyColor(
                    item.urgency,
                  )}`}
                >
                  <div>
                    <p className="font-semibold">{item.medicine}</p>
                    <div className="grid grid-cols-3 gap-8 mt-2 text-sm">
                      <div>
                        <p className="text-xs opacity-80">Current Stock</p>
                        <p className="font-semibold">
                          {item.currentStock.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-80">Predicted Demand</p>
                        <p className="font-semibold">
                          {item.predictedDemand.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs opacity-80">Recommended Alloc</p>
                        <p className="font-semibold">
                          {item.recommendedAllocation.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-black/30 hover:bg-black/50 transition-all font-semibold whitespace-nowrap">
                    Approve & Apply
                  </button>
                </div>
              ))}
            </div>

            {/* Allocation Summary */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">Allocation Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-red-500/30">
                  <p className="text-slate-400 text-sm">Critical Priority</p>
                  <p className="text-2xl font-bold text-red-400 mt-2">
                    2 items
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-orange-500/30">
                  <p className="text-slate-400 text-sm">High Priority</p>
                  <p className="text-2xl font-bold text-orange-400 mt-2">
                    1 item
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-yellow-500/30">
                  <p className="text-slate-400 text-sm">Medium Priority</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-2">
                    1 item
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-emerald-500/30">
                  <p className="text-slate-400 text-sm">Total Allocation</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">
                    2,400 units
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            {/* Supply vs Demand Comparison */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">
                Demand vs Supply Gap Analysis
              </h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={comparisonData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(6, 182, 212, 0.1)"
                  />
                  <XAxis
                    dataKey="medicine"
                    stroke="rgba(148, 163, 184, 0.6)"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="rgba(148, 163, 184, 0.6)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="demand" fill="#06B6D4" />
                  <Bar dataKey="supply" fill="#14B8A6" />
                  <Bar dataKey="gap" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stock Trend */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">
                Weekly Stock vs Usage Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stockTrendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(6, 182, 212, 0.1)"
                  />
                  <XAxis dataKey="week" stroke="rgba(148, 163, 184, 0.6)" />
                  <YAxis stroke="rgba(148, 163, 184, 0.6)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid rgba(6, 182, 212, 0.2)",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="stock"
                    stroke="#06B6D4"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="usage"
                    stroke="#F59E0B"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Generate Reports */}
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Generate Reports</h3>
                <div className="space-y-3">
                  <button className="w-full p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                    <p className="font-semibold text-cyan-400">
                      Allocation Report
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Download recommendations & analysis
                    </p>
                  </button>
                  <button className="w-full p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                    <p className="font-semibold text-cyan-400">
                      Forecast Report
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Monthly demand predictions
                    </p>
                  </button>
                  <button className="w-full p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                    <p className="font-semibold text-cyan-400">
                      Stock Performance
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      Usage patterns & efficiency metrics
                    </p>
                  </button>
                  <button className="w-full p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                    <p className="font-semibold text-cyan-400">
                      Compliance Report
                    </p>
                    <p className="text-sm text-slate-400 mt-1">
                      System audit & data integrity check
                    </p>
                  </button>
                </div>
              </div>

              {/* Recent Reports */}
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Recent Reports</h3>
                <div className="space-y-3">
                  {[
                    {
                      name: "Allocation Report - March 2026",
                      date: "2026-03-10",
                      size: "2.4 MB",
                    },
                    {
                      name: "Forecast Report - February 2026",
                      date: "2026-02-28",
                      size: "1.8 MB",
                    },
                    {
                      name: "Stock Performance - January 2026",
                      date: "2026-01-31",
                      size: "3.2 MB",
                    },
                  ].map((report, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-semibold text-slate-200">
                          {report.name}
                        </p>
                        <p className="text-xs text-slate-500">{report.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">{report.size}</p>
                        <button className="text-cyan-400 text-sm hover:text-cyan-300">
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Report Statistics */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">Report Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-sm">Total Reports</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-2">42</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-sm">This Month</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-2">8</p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-sm">Last Generated</p>
                  <p className="text-sm font-semibold text-cyan-400 mt-2">
                    Today 2:30 PM
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-sm">Storage Used</p>
                  <p className="text-2xl font-bold text-cyan-400 mt-2">
                    145 MB
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
