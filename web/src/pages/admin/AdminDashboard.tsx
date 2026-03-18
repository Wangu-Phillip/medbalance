import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../../firebaseConfig";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getBytes,
  deleteObject,
  listAll,
} from "firebase/storage";
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
  createdAt?: number;
  updatedAt?: number;
}

interface District {
  id: string;
  name: string;
  facilities: number;
  status: "active" | "inactive";
  createdAt?: number;
  updatedAt?: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "overview" | "medicines" | "districts" | "data"
  >("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [editingMedicine, setEditingMedicine] = useState<MedicineRecord | null>(
    null,
  );
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [savingDistrict, setSavingDistrict] = useState(false);
  const [showMedicineDatePicker, setShowMedicineDatePicker] = useState(false);
  const [showDistrictDatePicker, setShowDistrictDatePicker] = useState(false);

  const [newMedicine, setNewMedicine] = useState({
    name: "",
    quantity: "",
    unit: "",
    expiryDate: "",
  });
  const [newDistrict, setNewDistrict] = useState({ name: "", facilities: "" });

  // Fetch medicines and districts from Firestore
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch medicines
      const medicinesSnapshot = await getDocs(
        query(collection(db, "medicines"), orderBy("createdAt", "desc")),
      );
      const medicinesData = medicinesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MedicineRecord[];
      setMedicines(medicinesData);

      // Fetch districts
      const districtsSnapshot = await getDocs(
        query(collection(db, "districts"), orderBy("createdAt", "desc")),
      );
      const districtsData = districtsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as District[];
      setDistricts(districtsData);

      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data from database");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
      setLoggingOut(false);
      setError("Failed to logout");
    }
  };

  // Add Medicine
  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newMedicine.name ||
      !newMedicine.quantity ||
      !newMedicine.unit ||
      !newMedicine.expiryDate
    ) {
      setError("Please fill all medicine fields");
      return;
    }

    try {
      setSavingMedicine(true);
      const now = Date.now();
      if (editingMedicine) {
        // Update existing medicine
        await updateDoc(doc(db, "medicines", editingMedicine.id), {
          name: newMedicine.name,
          quantity: parseInt(newMedicine.quantity),
          unit: newMedicine.unit,
          expiryDate: newMedicine.expiryDate,
          updatedAt: now,
        });
        setSuccess("Medicine updated successfully");
        setEditingMedicine(null);
      } else {
        // Add new medicine
        await addDoc(collection(db, "medicines"), {
          name: newMedicine.name,
          quantity: parseInt(newMedicine.quantity),
          unit: newMedicine.unit,
          expiryDate: newMedicine.expiryDate,
          createdAt: now,
          updatedAt: now,
        });
        setSuccess("Medicine added successfully");
      }
      setNewMedicine({ name: "", quantity: "", unit: "", expiryDate: "" });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding/updating medicine:", err);
      setError("Failed to add/update medicine");
    } finally {
      setSavingMedicine(false);
    }
  };

  // Delete Medicine
  const handleDeleteMedicine = async (medicineId: string) => {
    if (!confirm("Are you sure you want to delete this medicine?")) return;

    try {
      setSavingMedicine(true);
      await deleteDoc(doc(db, "medicines", medicineId));
      setSuccess("Medicine deleted successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting medicine:", err);
      setError("Failed to delete medicine");
    } finally {
      setSavingMedicine(false);
    }
  };

  // Edit Medicine
  const handleEditMedicine = (medicine: MedicineRecord) => {
    setEditingMedicine(medicine);
    setNewMedicine({
      name: medicine.name,
      quantity: medicine.quantity.toString(),
      unit: medicine.unit,
      expiryDate: medicine.expiryDate,
    });
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingMedicine(null);
    setNewMedicine({ name: "", quantity: "", unit: "", expiryDate: "" });
    setShowMedicineDatePicker(false);
  };

  // Add District
  const handleAddDistrict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistrict.name || !newDistrict.facilities) {
      setError("Please fill all district fields");
      return;
    }

    try {
      setSavingDistrict(true);
      const now = Date.now();
      if (editingDistrict) {
        // Update existing district
        await updateDoc(doc(db, "districts", editingDistrict.id), {
          name: newDistrict.name,
          facilities: parseInt(newDistrict.facilities),
          updatedAt: now,
        });
        setSuccess("District updated successfully");
        setEditingDistrict(null);
      } else {
        // Add new district
        await addDoc(collection(db, "districts"), {
          name: newDistrict.name,
          facilities: parseInt(newDistrict.facilities),
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        setSuccess("District added successfully");
      }
      setNewDistrict({ name: "", facilities: "" });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding/updating district:", err);
      setError("Failed to add/update district");
    } finally {
      setSavingDistrict(false);
    }
  };

  // Delete District
  const handleDeleteDistrict = async (districtId: string) => {
    if (!confirm("Are you sure you want to delete this district?")) return;

    try {
      setSavingDistrict(true);
      await deleteDoc(doc(db, "districts", districtId));
      setSuccess("District deleted successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting district:", err);
      setError("Failed to delete district");
    } finally {
      setSavingDistrict(false);
    }
  };

  // Edit District
  const handleEditDistrict = (district: District) => {
    setEditingDistrict(district);
    setNewDistrict({
      name: district.name,
      facilities: district.facilities.toString(),
    });
  };

  // Cancel Edit District
  const handleCancelEditDistrict = () => {
    setEditingDistrict(null);
    setNewDistrict({ name: "", facilities: "" });
    setShowDistrictDatePicker(false);
  };

  // Toggle District Status
  const handleToggleDistrictStatus = async (district: District) => {
    try {
      setSavingDistrict(true);
      const newStatus = district.status === "active" ? "inactive" : "active";
      await updateDoc(doc(db, "districts", district.id), {
        status: newStatus,
        updatedAt: Date.now(),
      });
      setSuccess(`District marked as ${newStatus}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating district status:", err);
      setError("Failed to update district status");
    } finally {
      setSavingDistrict(false);
    }
  };

  // Import Data
  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const data = JSON.parse(text);

      // Import medicines
      if (data.medicines && Array.isArray(data.medicines)) {
        for (const medicine of data.medicines) {
          await addDoc(collection(db, "medicines"), {
            name: medicine.name,
            quantity: parseInt(medicine.quantity),
            unit: medicine.unit,
            expiryDate: medicine.expiryDate,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      // Import districts
      if (data.districts && Array.isArray(data.districts)) {
        for (const district of data.districts) {
          await addDoc(collection(db, "districts"), {
            name: district.name,
            facilities: parseInt(district.facilities),
            status: district.status || "active",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      }

      // Upload file to Firebase Storage
      const fileRef = ref(storage, `imports/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);

      setSuccess("Data imported successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error importing data:", err);
      setError("Failed to import data. Please check the file format.");
    } finally {
      setImporting(false);
      (event.target as HTMLInputElement).value = "";
    }
  };

  // Export Data
  const handleExportData = async () => {
    try {
      setExporting(true);
      const data = {
        medicines: medicines,
        districts: districts,
        exportDate: new Date().toISOString(),
      };

      const dataString = JSON.stringify(data, null, 2);
      const blob = new Blob([dataString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `medbalance_export_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Also save to Firebase Storage for backup
      const fileRef = ref(
        storage,
        `exports/${Date.now()}_medbalance_export.json`,
      );
      await uploadBytes(fileRef, blob);

      setSuccess("Data exported successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error exporting data:", err);
      setError("Failed to export data");
    } finally {
      setExporting(false);
    }
  };

  const medicineDistributionData = medicines.map((medicine) => ({
    name: medicine.name,
    value: medicine.quantity,
  }));

  const districtCapacityData = districts.map((district) => ({
    name: district.name,
    capacity: 100,
    current: (Math.random() * 100) | 0,
  }));

  const colors = ["#06B6D4", "#14B8A6", "#F59E0B", "#EF4444"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
      {/* Alerts */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex justify-between items-start">
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-4 text-red-100 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 bg-emerald-500/90 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-sm">
          <div className="flex justify-between items-start">
            <p>{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-4 text-emerald-100 hover:text-white"
            >
              ×
            </button>
          </div>
        </div>
      )}

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
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin">
              <div className="h-12 w-12 border-4 border-cyan-400 border-t-transparent rounded-full"></div>
            </div>
            <p className="ml-4 text-slate-400">Loading data...</p>
          </div>
        )}

        {!loading && (
          <>
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
                    <div className="text-slate-400 text-sm mb-2">
                      Total Units
                    </div>
                    <div className="text-3xl font-bold text-cyan-400">
                      {medicines.reduce((sum, m) => sum + m.quantity, 0)}
                    </div>
                  </div>
                </div>

                {/* Charts */}
                {medicineDistributionData.length > 0 && (
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
                              <Cell
                                key={`cell-${index}`}
                                fill={colors[index % colors.length]}
                              />
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
                )}
              </div>
            )}

            {/* Medicines Tab */}
            {activeTab === "medicines" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Add Medicine Form */}
                  <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingMedicine ? "Edit Medicine" : "Add New Medicine"}
                    </h3>
                    <form onSubmit={handleAddMedicine} className="space-y-4">
                      <input
                        type="text"
                        placeholder="Medicine Name"
                        value={newMedicine.name}
                        onChange={(e) =>
                          setNewMedicine({
                            ...newMedicine,
                            name: e.target.value,
                          })
                        }
                        disabled={savingMedicine}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={savingMedicine}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder="Unit (e.g., tablets, capsules)"
                        value={newMedicine.unit}
                        onChange={(e) =>
                          setNewMedicine({
                            ...newMedicine,
                            unit: e.target.value,
                          })
                        }
                        disabled={savingMedicine}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="relative">
                        <input
                          type="date"
                          value={newMedicine.expiryDate}
                          onChange={(e) =>
                            setNewMedicine({
                              ...newMedicine,
                              expiryDate: e.target.value,
                            })
                          }
                          onFocus={() => setShowMedicineDatePicker(true)}
                          disabled={savingMedicine}
                          placeholder="Select expiry date"
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <svg
                          className="absolute right-3 top-2.5 w-5 h-5 text-slate-400 pointer-events-none"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <button
                        type="submit"
                        disabled={savingMedicine}
                        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingMedicine ? (
                          <>
                            <span className="inline-block animate-spin">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </span>
                            Saving...
                          </>
                        ) : editingMedicine ? (
                          "Update Medicine"
                        ) : (
                          "Add Medicine"
                        )}
                      </button>
                      {editingMedicine && (
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          disabled={savingMedicine}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      )}
                    </form>
                  </div>

                  {/* Medicines List */}
                  <div className="lg:col-span-2 p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                    <h3 className="text-lg font-semibold mb-4">
                      Medicine Records ({medicines.length})
                    </h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {medicines.length === 0 ? (
                        <p className="text-slate-400 text-center py-8">
                          No medicines added yet
                        </p>
                      ) : (
                        medicines.map((medicine) => (
                          <div
                            key={medicine.id}
                            className={`p-4 bg-slate-900/50 rounded-lg border ${
                              editingMedicine?.id === medicine.id
                                ? "border-cyan-400 bg-cyan-500/10"
                                : "border-cyan-500/10"
                            } flex justify-between items-start`}
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
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditMedicine(medicine)}
                                disabled={savingMedicine}
                                className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteMedicine(medicine.id)
                                }
                                disabled={savingMedicine}
                                className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
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
                    <h3 className="text-lg font-semibold mb-4">
                      {editingDistrict ? "Edit District" : "Add New District"}
                    </h3>
                    <form onSubmit={handleAddDistrict} className="space-y-4">
                      <input
                        type="text"
                        placeholder="District Name"
                        value={newDistrict.name}
                        onChange={(e) =>
                          setNewDistrict({
                            ...newDistrict,
                            name: e.target.value,
                          })
                        }
                        disabled={savingDistrict}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        disabled={savingDistrict}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <button
                        type="submit"
                        disabled={savingDistrict}
                        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingDistrict ? (
                          <>
                            <span className="inline-block animate-spin">
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                            </span>
                            Saving...
                          </>
                        ) : editingDistrict ? (
                          "Update District"
                        ) : (
                          "Add District"
                        )}
                      </button>
                      {editingDistrict && (
                        <button
                          type="button"
                          onClick={handleCancelEditDistrict}
                          disabled={savingDistrict}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      )}
                    </form>
                  </div>

                  {/* Districts Grid */}
                  <div className="lg:col-span-2">
                    {districts.length === 0 ? (
                      <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 text-center">
                        <p className="text-slate-400">No districts added yet</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {districts.map((district) => (
                          <div
                            key={district.id}
                            className={`p-4 rounded-lg border transition-all ${
                              editingDistrict?.id === district.id
                                ? "border-cyan-400 bg-cyan-500/10 bg-gradient-to-br from-cyan-500/10 to-slate-900/60"
                                : "border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:border-cyan-400"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-cyan-400">
                                {district.name}
                              </h4>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                                  district.status === "active"
                                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                    : "bg-slate-500/20 text-slate-300 hover:bg-slate-500/30"
                                } disabled:opacity-50 disabled:cursor-not-allowed ${
                                  savingDistrict
                                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                                    : ""
                                }`}
                                onClick={() =>
                                  !savingDistrict &&
                                  handleToggleDistrictStatus(district)
                                }
                              >
                                {district.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-400">
                              {district.facilities} facilities
                            </p>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleEditDistrict(district)}
                                disabled={savingDistrict}
                                className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteDistrict(district.id)
                                }
                                disabled={savingDistrict}
                                className="text-red-400 hover:text-red-300 text-sm px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === "data" && (
              <div className="space-y-6">
                <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                  <h3 className="text-lg font-semibold mb-4">
                    Data Management
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left cursor-pointer">
                      <p className="font-semibold text-cyan-400">Import Data</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Upload JSON data file (medicines & districts)
                      </p>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        disabled={importing}
                        className="hidden"
                      />
                      {importing && (
                        <p className="text-xs text-cyan-300 mt-2">
                          Importing...
                        </p>
                      )}
                    </label>
                    <button
                      onClick={handleExportData}
                      disabled={exporting}
                      className="p-4 rounded-lg border border-cyan-500/20 hover:bg-cyan-500/10 transition-all text-left disabled:opacity-50"
                    >
                      <p className="font-semibold text-cyan-400">Export Data</p>
                      <p className="text-sm text-slate-400 mt-1">
                        Download current system data as JSON
                      </p>
                      {exporting && (
                        <p className="text-xs text-cyan-300 mt-2">
                          Exporting...
                        </p>
                      )}
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
                      <p className="text-slate-400 text-xs">Total Medicines</p>
                      <p className="text-lg font-semibold text-cyan-400 mt-1">
                        {medicines.length}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                      <p className="text-slate-400 text-xs">Total Districts</p>
                      <p className="text-lg font-semibold text-cyan-400 mt-1">
                        {districts.length}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                      <p className="text-slate-400 text-xs">
                        Total Stock Units
                      </p>
                      <p className="text-lg font-semibold text-cyan-400 mt-1">
                        {medicines.reduce((sum, m) => sum + m.quantity, 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/10">
                      <p className="text-slate-400 text-xs">
                        Active Facilities
                      </p>
                      <p className="text-lg font-semibold text-cyan-400 mt-1">
                        {districts
                          .filter((d) => d.status === "active")
                          .reduce((sum, d) => sum + d.facilities, 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
