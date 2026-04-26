import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConsumptionRecord {
  id: string;
  medicineName: string;
  quantity: number;
  unit: string;
  date: string;
  patientCount: number;
  notes: string;
  facilityId: string;
  facilityName: string;
  districtId: string;
  districtName: string;
  createdAt: number;
}

interface MedicineAllocation {
  id: string;
  medicineId: string;
  medicineName: string;
  facilityId: string;
  facilityName: string;
  allocationType: "quantity" | "percentage";
  amount: number;
  unit?: string;
  districtId: string;
  createdAt?: number;
}

interface MedicineRequest {
  id: string;
  medicineName: string;
  dosageForm: string;
  requestedQuantity: number;
  unit: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  facilityId: string;
  facilityName: string;
  districtId: string;
  districtName: string;
  createdAt?: number;
}

type TabId = "overview" | "consumption" | "stock" | "requests" | "analytics";

const CHART_COLORS = [
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacilityManagerDashboard() {
  const navigate = useNavigate();
  const {
    user,
    role,
    facilityId,
    facilityName,
    districtId,
    districtName,
    loading: authLoading,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [allocations, setAllocations] = useState<MedicineAllocation[]>([]);
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [medicinesById, setMedicinesById] = useState<Record<string, string>>({});

  // Consumption form
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [savingConsumption, setSavingConsumption] = useState(false);
  const [consumptionForm, setConsumptionForm] = useState({
    medicineName: "",
    quantity: "",
    unit: "",
    date: new Date().toISOString().split("T")[0],
    patientCount: "",
    notes: "",
  });

  // Request form
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [savingRequest, setSavingRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    medicineName: "",
    dosageForm: "",
    requestedQuantity: "",
    unit: "",
    reason: "",
  });

  // Redirect only when auth has finished loading and the role is wrong
  useEffect(() => {
    if (!authLoading && role !== "facility_manager") {
      navigate("/login");
    }
  }, [authLoading, role, navigate]);

  // Real-time data listeners
  useEffect(() => {
    if (!facilityId) {
      // No facility assigned yet — stop loading spinner
      setDataLoading(false);
      return;
    }

    setDataLoading(true);
    let loaded = 0;
    const total = 4;
    const onReady = () => {
      loaded++;
      if (loaded >= total) setDataLoading(false);
    };

    // Consumption records for this facility
    const consumptionQ = query(
      collection(db, "consumptionRecords"),
      where("facilityId", "==", facilityId),
      orderBy("createdAt", "desc"),
    );
    const unsubConsumption = onSnapshot(
      consumptionQ,
      (snap) => {
        setConsumptionRecords(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ConsumptionRecord[]);
        onReady();
      },
      (err) => {
        console.error("Error loading consumption records:", err);
        onReady();
      },
    );

    // Allocations for this facility
    const allocationsQ = query(
      collection(db, "medicineAllocations"),
      where("facilityId", "==", facilityId),
      orderBy("createdAt", "desc"),
    );
    const unsubAllocations = onSnapshot(
      allocationsQ,
      (snap) => {
        setAllocations(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MedicineAllocation[]);
        onReady();
      },
      (err) => {
        console.error("Error loading allocations:", err);
        onReady();
      },
    );

    // Medicine requests sent by this facility
    const requestsQ = query(
      collection(db, "medicineRequests"),
      where("facilityId", "==", facilityId),
      orderBy("createdAt", "desc"),
    );
    const unsubRequests = onSnapshot(
      requestsQ,
      (snap) => {
        setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as MedicineRequest[]);
        onReady();
      },
      (err) => {
        console.error("Error loading requests:", err);
        onReady();
      },
    );

    // Medicines lookup (by districtId) to resolve names from IDs
    const medicinesQ = query(
      collection(db, "medicines"),
      where("districtId", "==", districtId || ""),
    );
    const unsubMedicines = onSnapshot(
      medicinesQ,
      (snap) => {
        const map: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data = d.data();
          map[d.id] = data.name || d.id;
        });
        setMedicinesById(map);
        onReady();
      },
      (err) => {
        console.error("Error loading medicines:", err);
        onReady();
      },
    );

    return () => {
      unsubConsumption();
      unsubAllocations();
      unsubRequests();
      unsubMedicines();
    };
  }, [facilityId, districtId]);

  // Auto-clear messages
  useEffect(() => {
    if (error || success) {
      const t = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [error, success]);

  // ─── Derived data ────────────────────────────────────────────────────────

  /** Total consumed per medicine (aggregated from all records) */
  const consumedByMedicine = consumptionRecords.reduce<Record<string, number>>(
    (acc, r) => {
      acc[r.medicineName] = (acc[r.medicineName] || 0) + r.quantity;
      return acc;
    },
    {},
  );

  /** Allocated quantity per medicine */
  const allocatedByMedicine = allocations.reduce<Record<string, { amount: number; unit: string }>>(
    (acc, a) => {
      const name = a.medicineName || medicinesById[a.medicineId] || a.medicineId;
      if (!name) return acc;
      if (!acc[name]) {
        acc[name] = { amount: 0, unit: a.unit || "units" };
      }
      acc[name].amount += a.amount;
      return acc;
    },
    {},
  );

  /** Distinct medicine names available at this facility (from allocations) */
  const availableMedicineNames = Array.from(
    new Set(
      allocations
        .map((a) => a.medicineName || medicinesById[a.medicineId] || a.medicineId)
        .filter(Boolean) as string[],
    ),
  ).sort();

  /** Stock summary rows combining allocation and consumption */
  const stockSummary = Object.keys(allocatedByMedicine).map((name) => {
    const allocated = allocatedByMedicine[name].amount;
    const unit = allocatedByMedicine[name].unit;
    const consumed = consumedByMedicine[name] || 0;
    const available = Math.max(0, allocated - consumed);
    return { name, allocated, consumed, available, unit };
  });

  // Add any consumed medicines that may not have an allocation entry
  Object.keys(consumedByMedicine).forEach((name) => {
    if (name && !allocatedByMedicine[name]) {
      stockSummary.push({
        name,
        allocated: 0,
        consumed: consumedByMedicine[name],
        available: 0,
        unit: "units",
      });
    }
  });

  const totalAllocated = allocations.length;
  const totalConsumed = consumptionRecords.reduce((s, r) => s + r.quantity, 0);
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const lowStockCount = stockSummary.filter((s) => s.available < 10 && s.allocated > 0).length;

  /** Chart data: last 7 days consumption */
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const dailyChartData = last7Days.map((date) => {
    const dayRecords = consumptionRecords.filter((r) => r.date === date);
    const total = dayRecords.reduce((s, r) => s + r.quantity, 0);
    return {
      date: date.slice(5), // MM-DD
      consumed: total,
    };
  });

  /** Per-medicine consumption chart data */
  const medicineChartData = Object.entries(consumedByMedicine).map(([name, qty]) => ({
    name,
    consumed: qty,
  }));

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/login");
    } catch {
      setLoggingOut(false);
    }
  };

  const handleLogConsumption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !districtId) return;

    const { medicineName, quantity, unit, date, patientCount, notes } = consumptionForm;
    if (!medicineName || !quantity || !unit || !date) {
      setError("Please fill in all required fields");
      return;
    }
    if (parseFloat(quantity) <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }

    try {
      setSavingConsumption(true);
      await addDoc(collection(db, "consumptionRecords"), {
        medicineName: medicineName.trim(),
        quantity: parseFloat(quantity),
        unit: unit.trim(),
        date,
        patientCount: patientCount ? parseInt(patientCount) : 0,
        notes: notes.trim(),
        facilityId,
        facilityName: facilityName || "",
        districtId,
        districtName: districtName || "",
        createdAt: Date.now(),
      });
      setSuccess("Consumption record saved successfully");
      setConsumptionForm({
        medicineName: "",
        quantity: "",
        unit: "",
        date: new Date().toISOString().split("T")[0],
        patientCount: "",
        notes: "",
      });
      setShowConsumptionModal(false);
    } catch (err) {
      console.error("Error saving consumption record:", err);
      setError("Failed to save consumption record");
    } finally {
      setSavingConsumption(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId || !districtId) return;

    const { medicineName, dosageForm, requestedQuantity, unit, reason } = requestForm;
    if (!medicineName || !requestedQuantity || !unit || !reason) {
      setError("Please fill in all required fields");
      return;
    }
    if (parseInt(requestedQuantity) <= 0) {
      setError("Requested quantity must be greater than zero");
      return;
    }

    try {
      setSavingRequest(true);
      await addDoc(collection(db, "medicineRequests"), {
        medicineName: medicineName.trim(),
        dosageForm: dosageForm.trim(),
        requestedQuantity: parseInt(requestedQuantity),
        unit: unit.trim(),
        reason: reason.trim(),
        status: "pending",
        facilityId,
        facilityName: facilityName || "",
        districtId,
        districtName: districtName || "",
        createdAt: Date.now(),
      });
      setSuccess("Medicine request submitted successfully");
      setRequestForm({
        medicineName: "",
        dosageForm: "",
        requestedQuantity: "",
        unit: "",
        reason: "",
      });
      setShowRequestModal(false);
    } catch (err) {
      console.error("Error submitting request:", err);
      setError("Failed to submit request");
    } finally {
      setSavingRequest(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-violet-400 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "consumption", label: "Daily Consumption" },
    { id: "stock", label: "Stock" },
    { id: "requests", label: "Requests" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
      {/* ── Header ── */}
      <header className="bg-slate-900/80 border-b border-violet-500/20 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-violet-400 rounded-lg flex items-center justify-center text-sm font-bold text-white">
                Rx
              </div>
              <div>
                <h1 className="text-base font-bold bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent leading-tight">
                  MedBalance AI
                </h1>
                <p className="text-xs text-slate-400 leading-tight">
                  {facilityName || "Facility"} · {districtName || "District"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-medium text-slate-200">
                  {user?.displayName || user?.email?.split("@")[0] || "Pharmacist"}
                </span>
                <span className="text-xs text-violet-400">Facility Manager</span>
              </div>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-all disabled:opacity-50"
              >
                {loggingOut ? "Signing out…" : "Sign Out"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Notifications ── */}
      {(error || success || !facilityId) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-2">
          {!facilityId && (
            <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-lg text-amber-200 text-sm">
              Your account is not linked to a facility yet. Contact your administrator to assign you to a facility so stock and consumption data can be tracked.
            </div>
          )}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg text-red-200 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-lg text-emerald-200 text-sm">
              {success}
            </div>
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-violet-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ════ OVERVIEW ════ */}
        {activeTab === "overview" && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Dashboard Overview</h2>
              <p className="text-slate-400 text-sm mt-1">
                {facilityName} · {districtName}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Allocated Medicines"
                value={totalAllocated}
                sub="active allocations"
                color="violet"
              />
              <StatCard
                label="Total Consumed"
                value={totalConsumed}
                sub="units dispensed"
                color="cyan"
              />
              <StatCard
                label="Pending Requests"
                value={pendingRequests}
                sub="awaiting approval"
                color="amber"
              />
              <StatCard
                label="Low Stock Items"
                value={lowStockCount}
                sub="need restocking"
                color={lowStockCount > 0 ? "red" : "emerald"}
              />
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionCard
                title="Log Daily Consumption"
                description="Record medicines dispensed to patients today"
                buttonLabel="Log Consumption"
                color="violet"
                onClick={() => { setActiveTab("consumption"); setShowConsumptionModal(true); }}
              />
              <ActionCard
                title="Request Medicines"
                description="Submit a medicine request to the district manager"
                buttonLabel="New Request"
                color="cyan"
                onClick={() => { setActiveTab("requests"); setShowRequestModal(true); }}
              />
            </div>

            {/* Recent consumption */}
            {consumptionRecords.length > 0 && (
              <SectionCard title="Recent Consumption">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700/50">
                        <th className="text-left py-2 pr-4">Medicine</th>
                        <th className="text-right py-2 pr-4">Qty</th>
                        <th className="text-right py-2 pr-4">Patients</th>
                        <th className="text-right py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumptionRecords.slice(0, 5).map((r) => (
                        <tr key={r.id} className="border-b border-slate-700/30">
                          <td className="py-2 pr-4 font-medium">{r.medicineName}</td>
                          <td className="py-2 pr-4 text-right text-cyan-400">
                            {r.quantity} {r.unit}
                          </td>
                          <td className="py-2 pr-4 text-right text-slate-300">{r.patientCount || "—"}</td>
                          <td className="py-2 text-right text-slate-400">{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ════ DAILY CONSUMPTION ════ */}
        {activeTab === "consumption" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Daily Consumption</h2>
                <p className="text-slate-400 text-sm mt-1">Log medicines dispensed to patients</p>
              </div>
              <button
                onClick={() => setShowConsumptionModal(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all"
              >
                + Log Consumption
              </button>
            </div>

            {consumptionRecords.length === 0 ? (
              <EmptyState
                title="No consumption records yet"
                description="Start logging daily medicine consumption using the button above"
              />
            ) : (
              <SectionCard title="Consumption History">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700/50">
                        <th className="text-left py-2 pr-3">Date</th>
                        <th className="text-left py-2 pr-3">Medicine</th>
                        <th className="text-right py-2 pr-3">Qty</th>
                        <th className="text-right py-2 pr-3">Patients</th>
                        <th className="text-left py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {consumptionRecords.map((r) => (
                        <tr key={r.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                          <td className="py-2.5 pr-3 text-slate-400 whitespace-nowrap">{r.date}</td>
                          <td className="py-2.5 pr-3 font-medium">{r.medicineName}</td>
                          <td className="py-2.5 pr-3 text-right text-cyan-400 whitespace-nowrap">
                            {r.quantity} {r.unit}
                          </td>
                          <td className="py-2.5 pr-3 text-right text-slate-300">{r.patientCount || "—"}</td>
                          <td className="py-2.5 text-slate-400 text-xs max-w-xs truncate">{r.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ════ STOCK ════ */}
        {activeTab === "stock" && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Stock Overview</h2>
              <p className="text-slate-400 text-sm mt-1">Available vs. consumed stock at {facilityName}</p>
            </div>

            {stockSummary.length === 0 ? (
              <EmptyState
                title="No stock data available"
                description="Stock appears once medicines are allocated to your facility by the district manager"
              />
            ) : (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <StatCard
                    label="Total Allocated"
                    value={stockSummary.reduce((s, r) => s + r.allocated, 0)}
                    sub="units allocated"
                    color="violet"
                  />
                  <StatCard
                    label="Total Consumed"
                    value={stockSummary.reduce((s, r) => s + r.consumed, 0)}
                    sub="units dispensed"
                    color="amber"
                  />
                  <StatCard
                    label="Total Available"
                    value={stockSummary.reduce((s, r) => s + r.available, 0)}
                    sub="units remaining"
                    color="emerald"
                  />
                </div>

                {/* Stock table */}
                <SectionCard title="Medicine Stock Breakdown">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-700/50">
                          <th className="text-left py-2 pr-4">Medicine</th>
                          <th className="text-right py-2 pr-4">Allocated</th>
                          <th className="text-right py-2 pr-4">Consumed</th>
                          <th className="text-right py-2 pr-4">Available</th>
                          <th className="text-center py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockSummary.map((row) => {
                          const pct = row.allocated > 0 ? (row.available / row.allocated) * 100 : 0;
                          const status =
                            row.available === 0 ? "out"
                            : pct < 20 ? "critical"
                            : pct < 40 ? "low"
                            : "ok";
                          return (
                            <tr key={row.name} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                              <td className="py-2.5 pr-4 font-medium">{row.name}</td>
                              <td className="py-2.5 pr-4 text-right text-slate-300">
                                {row.allocated} {row.unit}
                              </td>
                              <td className="py-2.5 pr-4 text-right text-amber-400">
                                {row.consumed} {row.unit}
                              </td>
                              <td className="py-2.5 pr-4 text-right text-cyan-400">
                                {row.available} {row.unit}
                              </td>
                              <td className="py-2.5 text-center">
                                <StockBadge status={status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Progress bars */}
                  <div className="mt-6 space-y-3">
                    <p className="text-sm font-semibold text-slate-300">Stock Consumption Rate</p>
                    {stockSummary.filter((s) => s.allocated > 0).map((row) => {
                      const pct = Math.min(100, Math.round((row.consumed / row.allocated) * 100));
                      return (
                        <div key={row.name}>
                          <div className="flex justify-between text-xs text-slate-400 mb-1">
                            <span>{row.name}</span>
                            <span>{pct}% used</span>
                          </div>
                          <div className="w-full bg-slate-700/50 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                pct >= 80 ? "bg-red-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>
              </>
            )}
          </>
        )}

        {/* ════ REQUESTS ════ */}
        {activeTab === "requests" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-100">Medicine Requests</h2>
                <p className="text-slate-400 text-sm mt-1">
                  Request medicines from {districtName || "the district manager"}
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-all"
              >
                + New Request
              </button>
            </div>

            {requests.length === 0 ? (
              <EmptyState
                title="No requests submitted yet"
                description="Use the button above to request medicines from your district manager"
              />
            ) : (
              <SectionCard title="Request History">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-700/50">
                        <th className="text-left py-2 pr-4">Medicine</th>
                        <th className="text-left py-2 pr-4">Form</th>
                        <th className="text-right py-2 pr-4">Qty</th>
                        <th className="text-left py-2 pr-4">Reason</th>
                        <th className="text-center py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => (
                        <tr key={r.id} className="border-b border-slate-700/30 hover:bg-slate-800/30">
                          <td className="py-2.5 pr-4 font-medium">{r.medicineName}</td>
                          <td className="py-2.5 pr-4 text-slate-300">{r.dosageForm || "—"}</td>
                          <td className="py-2.5 pr-4 text-right text-cyan-400">
                            {r.requestedQuantity} {r.unit}
                          </td>
                          <td className="py-2.5 pr-4 text-slate-400 text-xs max-w-xs truncate">{r.reason}</td>
                          <td className="py-2.5 text-center">
                            <RequestStatusBadge status={r.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionCard>
            )}
          </>
        )}

        {/* ════ ANALYTICS ════ */}
        {activeTab === "analytics" && (
          <>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Analytics</h2>
              <p className="text-slate-400 text-sm mt-1">Charts of medicines dispensed at {facilityName}</p>
            </div>

            {consumptionRecords.length === 0 ? (
              <EmptyState
                title="No data to display yet"
                description="Log daily consumption records to see analytics charts"
              />
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Daily consumption – last 7 days */}
                <SectionCard title="Daily Consumption (Last 7 Days)">
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={dailyChartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#f1f5f9" }}
                      />
                      <Bar dataKey="consumed" name="Units Consumed" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </SectionCard>

                {/* Per-medicine breakdown */}
                <SectionCard title="Consumption by Medicine">
                  {medicineChartData.length === 0 ? (
                    <p className="text-slate-400 text-sm text-center py-8">No data yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={medicineChartData}
                        layout="vertical"
                        margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          width={120}
                        />
                        <Tooltip
                          contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#f1f5f9" }}
                        />
                        <Bar dataKey="consumed" name="Units Consumed" radius={[0, 4, 4, 0]}>
                          {medicineChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </SectionCard>

                {/* Stock distribution pie */}
                {stockSummary.filter((s) => s.allocated > 0).length > 0 && (
                  <SectionCard title="Stock Distribution">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={stockSummary.filter((s) => s.allocated > 0)}
                          dataKey="available"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {stockSummary.filter((s) => s.allocated > 0).map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#f1f5f9" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </SectionCard>
                )}

                {/* Allocated vs Consumed */}
                {stockSummary.length > 0 && (
                  <SectionCard title="Allocated vs. Consumed">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart
                        data={stockSummary}
                        margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis
                          dataKey="name"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          interval={0}
                          angle={-30}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: "#1e293b", border: "1px solid #475569", borderRadius: "8px", color: "#f1f5f9" }}
                        />
                        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: "12px" }} />
                        <Bar dataKey="allocated" name="Allocated" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="consumed" name="Consumed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="available" name="Available" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </SectionCard>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* ════ CONSUMPTION MODAL ════ */}
      {showConsumptionModal && (
        <Modal title="Log Daily Consumption" onClose={() => setShowConsumptionModal(false)}>
          <form onSubmit={handleLogConsumption} className="space-y-4">
            <FormField label="Medicine Name *">
              <input
                type="text"
                list="consumption-medicine-list"
                value={consumptionForm.medicineName}
                onChange={(e) => setConsumptionForm((p) => ({ ...p, medicineName: e.target.value }))}
                placeholder={availableMedicineNames.length > 0 ? "Select or type medicine name" : "e.g. Amoxicillin"}
                className={inputCls}
              />
              <datalist id="consumption-medicine-list">
                {availableMedicineNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity *">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={consumptionForm.quantity}
                  onChange={(e) => setConsumptionForm((p) => ({ ...p, quantity: e.target.value }))}
                  placeholder="e.g. 50"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Unit *">
                <select
                  value={consumptionForm.unit}
                  onChange={(e) => setConsumptionForm((p) => ({ ...p, unit: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select unit</option>
                  {["tablets", "capsules", "vials", "bottles", "sachets", "ampoules", "units"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Date *">
                <input
                  type="date"
                  value={consumptionForm.date}
                  onChange={(e) => setConsumptionForm((p) => ({ ...p, date: e.target.value }))}
                  className={inputCls}
                />
              </FormField>
              <FormField label="No. of Patients">
                <input
                  type="number"
                  min="0"
                  value={consumptionForm.patientCount}
                  onChange={(e) => setConsumptionForm((p) => ({ ...p, patientCount: e.target.value }))}
                  placeholder="e.g. 12"
                  className={inputCls}
                />
              </FormField>
            </div>

            <FormField label="Notes (optional)">
              <textarea
                rows={2}
                value={consumptionForm.notes}
                onChange={(e) => setConsumptionForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional notes…"
                className={inputCls}
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConsumptionModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingConsumption}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                {savingConsumption ? "Saving…" : "Save Record"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ════ REQUEST MODAL ════ */}
      {showRequestModal && (
        <Modal title="Request Medicines" onClose={() => setShowRequestModal(false)}>
          <form onSubmit={handleSubmitRequest} className="space-y-4">
            <FormField label="Medicine Name *">
              <input
                type="text"
                list="request-medicine-list"
                value={requestForm.medicineName}
                onChange={(e) => setRequestForm((p) => ({ ...p, medicineName: e.target.value }))}
                placeholder={availableMedicineNames.length > 0 ? "Select or type medicine name" : "e.g. Paracetamol"}
                className={inputCls}
              />
              <datalist id="request-medicine-list">
                {availableMedicineNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </FormField>

            <FormField label="Dosage Form">
              <input
                type="text"
                value={requestForm.dosageForm}
                onChange={(e) => setRequestForm((p) => ({ ...p, dosageForm: e.target.value }))}
                placeholder="e.g. 500mg tablets"
                className={inputCls}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Quantity *">
                <input
                  type="number"
                  min="1"
                  value={requestForm.requestedQuantity}
                  onChange={(e) => setRequestForm((p) => ({ ...p, requestedQuantity: e.target.value }))}
                  placeholder="e.g. 200"
                  className={inputCls}
                />
              </FormField>
              <FormField label="Unit *">
                <select
                  value={requestForm.unit}
                  onChange={(e) => setRequestForm((p) => ({ ...p, unit: e.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select unit</option>
                  {["tablets", "capsules", "vials", "bottles", "sachets", "ampoules", "units"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Reason *">
              <textarea
                rows={3}
                value={requestForm.reason}
                onChange={(e) => setRequestForm((p) => ({ ...p, reason: e.target.value }))}
                placeholder="Why do you need these medicines? e.g. Current stock critically low, high patient demand this month…"
                className={inputCls}
              />
            </FormField>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRequestModal(false)}
                className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingRequest}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                {savingRequest ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm transition-all";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 border border-slate-600/50 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5">
      <h3 className="font-semibold text-slate-200 mb-4">{title}</h3>
      {children}
    </div>
  );
}

type ColorKey = "violet" | "cyan" | "amber" | "emerald" | "red";
const colorMap: Record<ColorKey, string> = {
  violet: "from-violet-500/20 to-violet-600/10 border-violet-500/30 text-violet-400",
  cyan: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30 text-cyan-400",
  amber: "from-amber-500/20 to-amber-600/10 border-amber-500/30 text-amber-400",
  emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/30 text-emerald-400",
  red: "from-red-500/20 to-red-600/10 border-red-500/30 text-red-400",
};

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: ColorKey;
}) {
  const cls = colorMap[color] ?? colorMap.violet;
  return (
    <div className={`bg-gradient-to-br ${cls} border rounded-xl p-4`}>
      <p className="text-xs font-medium text-slate-400 mb-2">{label}</p>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  buttonLabel,
  color,
  onClick,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  color: ColorKey;
  onClick: () => void;
}) {
  const btnCls =
    color === "violet"
      ? "bg-violet-600 hover:bg-violet-500"
      : "bg-cyan-600 hover:bg-cyan-500";
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-5 flex flex-col gap-3">
      <div>
        <h3 className="font-semibold text-slate-200">{title}</h3>
        <p className="text-sm text-slate-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`self-start px-4 py-2 ${btnCls} text-white rounded-lg text-sm font-medium transition-all`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-12 text-center">
      <h3 className="font-semibold text-slate-300 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function StockBadge({ status }: { status: "ok" | "low" | "critical" | "out" }) {
  const map = {
    ok: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    low: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    critical: "bg-red-500/20 text-red-300 border-red-500/30",
    out: "bg-slate-600/40 text-slate-400 border-slate-500/30",
  };
  const labels = { ok: "In Stock", low: "Low", critical: "Critical", out: "Out of Stock" };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function RequestStatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    approved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    rejected: "bg-red-500/20 text-red-300 border-red-500/30",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${map[status]} capitalize`}>
      {status}
    </span>
  );
}
