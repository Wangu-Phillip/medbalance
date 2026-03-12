import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
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

interface MedicineRecord {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
}

interface District {
  id: string;
  name: string;
  facilities: number;
  status: "active" | "inactive";
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "overview" | "medicines" | "districts" | "data"
  >("overview");
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
  const [medicines, setMedicines] = useState<MedicineRecord[]>([
    {
      id: "1",
      name: "Paracetamol",
      quantity: 5000,
      unit: "tablets",
      expiryDate: "2026-12-31",
    },
    {
      id: "2",
      name: "Amoxicillin",
      quantity: 2000,
      unit: "capsules",
      expiryDate: "2026-08-15",
    },
    {
      id: "3",
      name: "Ibuprofen",
      quantity: 3500,
      unit: "tablets",
      expiryDate: "2027-01-20",
    },
  ]);
  const [districts, setDistricts] = useState<District[]>([
    { id: "1", name: "Central", facilities: 12, status: "active" },
    { id: "2", name: "North East", facilities: 8, status: "active" },
    { id: "3", name: "South East", facilities: 10, status: "active" },
    { id: "4", name: "South Central", facilities: 7, status: "inactive" },
  ]);

  const [newMedicine, setNewMedicine] = useState({
    name: "",
    quantity: "",
    unit: "",
    expiryDate: "",
  });
  const [newDistrict, setNewDistrict] = useState({ name: "", facilities: "" });

  const medicineDistributionData = [
    { name: "Paracetamol", value: 5000 },
    { name: "Amoxicillin", value: 2000 },
    { name: "Ibuprofen", value: 3500 },
  ];

  const districtCapacityData = [
    { name: "Central", capacity: 95, current: 78 },
    { name: "North East", capacity: 85, current: 65 },
    { name: "South East", capacity: 90, current: 72 },
    { name: "South Central", capacity: 80, current: 55 },
  ];

  const colors = ["#06B6D4", "#14B8A6", "#F59E0B", "#EF4444"];

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newMedicine.name &&
      newMedicine.quantity &&
      newMedicine.unit &&
      newMedicine.expiryDate
    ) {
      setMedicines([
        ...medicines,
        {
          id: String(medicines.length + 1),
          name: newMedicine.name,
          quantity: parseInt(newMedicine.quantity),
          unit: newMedicine.unit,
          expiryDate: newMedicine.expiryDate,
        },
      ]);
      setNewMedicine({ name: "", quantity: "", unit: "", expiryDate: "" });
    }
  };

  const handleAddDistrict = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDistrict.name && newDistrict.facilities) {
      setDistricts([
        ...districts,
        {
          id: String(districts.length + 1),
          name: newDistrict.name,
          facilities: parseInt(newDistrict.facilities),
          status: "active",
        },
      ]);
      setNewDistrict({ name: "", facilities: "" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/10 bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              Admin Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Manage medicines, districts, and system data
            </p>
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
        <div className="max-w-7xl mx-auto flex gap-8">
          {[
            { key: "overview", label: "Overview" },
            { key: "medicines", label: "Medicines" },
            { key: "districts", label: "Districts" },
            { key: "data", label: "Data Management" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as "overview" | "medicines" | "districts" | "data",
                )
              }
              className={`py-4 px-2 border-b-2 transition-all ${
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Total Medicines
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  {medicines.length}
                </div>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Active Districts
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  {districts.filter((d) => d.status === "active").length}
                </div>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Total Facilities
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  {districts.reduce((sum, d) => sum + d.facilities, 0)}
                </div>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">Total Units</div>
                <div className="text-3xl font-bold text-cyan-400">
                  {medicines.reduce((sum, m) => sum + m.quantity, 0)}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">
                  Medicine Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={medicineDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) =>
                        `${name}: ${value.toLocaleString()}`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {medicineDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">
                  District Capacity vs Current Stock
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={districtCapacityData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(6, 182, 212, 0.1)"
                    />
                    <XAxis
                      dataKey="name"
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
                    <Bar dataKey="capacity" fill="#06B6D4" />
                    <Bar dataKey="current" fill="#14B8A6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Medicines Tab */}
        {activeTab === "medicines" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add Medicine Form */}
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Add New Medicine</h3>
                <form onSubmit={handleAddMedicine} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Medicine Name"
                    value={newMedicine.name}
                    onChange={(e) =>
                      setNewMedicine({ ...newMedicine, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={newMedicine.quantity}
                    onChange={(e) =>
                      setNewMedicine({
                        ...newMedicine,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <input
                    type="text"
                    placeholder="Unit (e.g., tablets, capsules)"
                    value={newMedicine.unit}
                    onChange={(e) =>
                      setNewMedicine({ ...newMedicine, unit: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <input
                    type="date"
                    value={newMedicine.expiryDate}
                    onChange={(e) =>
                      setNewMedicine({
                        ...newMedicine,
                        expiryDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all"
                  >
                    Add Medicine
                  </button>
                </form>
              </div>

              {/* Medicines List */}
              <div className="lg:col-span-2 p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Medicine Records</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {medicines.map((medicine) => (
                    <div
                      key={medicine.id}
                      className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10 flex justify-between items-start"
                    >
                      <div>
                        <p className="font-semibold text-cyan-400">
                          {medicine.name}
                        </p>
                        <p className="text-sm text-slate-400">
                          {medicine.quantity} {medicine.unit}
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires: {medicine.expiryDate}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setMedicines(
                            medicines.filter((m) => m.id !== medicine.id),
                          )
                        }
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Districts Tab */}
        {activeTab === "districts" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Add District Form */}
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4">Add New District</h3>
                <form onSubmit={handleAddDistrict} className="space-y-4">
                  <input
                    type="text"
                    placeholder="District Name"
                    value={newDistrict.name}
                    onChange={(e) =>
                      setNewDistrict({ ...newDistrict, name: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <input
                    type="number"
                    placeholder="Number of Facilities"
                    value={newDistrict.facilities}
                    onChange={(e) =>
                      setNewDistrict({
                        ...newDistrict,
                        facilities: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all"
                  >
                    Add District
                  </button>
                </form>
              </div>

              {/* Districts Grid */}
              <div className="lg:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {districts.map((district) => (
                    <div
                      key={district.id}
                      className="p-4 rounded-lg border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:border-cyan-400 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-cyan-400">
                          {district.name}
                        </h4>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            district.status === "active"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {district.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400">
                        {district.facilities} facilities
                      </p>
                      <button
                        onClick={() =>
                          setDistricts(
                            districts.filter((d) => d.id !== district.id),
                          )
                        }
                        className="mt-3 text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Data Management Tab */}
        {activeTab === "data" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">Data Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                  <p className="font-semibold text-cyan-400">Import Data</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Upload historical medicine consumption data
                  </p>
                </button>
                <button className="p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                  <p className="font-semibold text-cyan-400">Export Data</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Download current system data
                  </p>
                </button>
                <button className="p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left">
                  <p className="font-semibold text-cyan-400">System Logs</p>
                  <p className="text-sm text-slate-400 mt-1">
                    View system activity and changes
                  </p>
                </button>
              </div>

              {/* Data Statistics */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-xs">Last Data Import</p>
                  <p className="text-lg font-semibold text-cyan-400 mt-1">
                    2024-03-10
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-xs">Data Records</p>
                  <p className="text-lg font-semibold text-cyan-400 mt-1">
                    12,453
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-xs">System Uptime</p>
                  <p className="text-lg font-semibold text-cyan-400 mt-1">
                    99.8%
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                  <p className="text-slate-400 text-xs">Active Users</p>
                  <p className="text-lg font-semibold text-cyan-400 mt-1">24</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
