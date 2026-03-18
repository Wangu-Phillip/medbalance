import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { generateStockAnalysis } from "../../api";
import type { StockAnalysisResponse } from "../../types";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  where,
} from "firebase/firestore";
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

interface MedicineRecord {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  allocatedQuantity: number;
  districtId: string;
  districtName: string;
  createdAt?: number;
  updatedAt?: number;
}

interface Facility {
  id: string;
  name: string;
  districtId: string;
  districtName: string;
  status: "active" | "inactive";
  createdAt?: number;
  updatedAt?: number;
}

interface MedicineAllocation {
  id: string;
  medicineId: string;
  medicineName: string;
  facilityId: string;
  facilityName: string;
  allocationType: "quantity" | "percentage";
  amount: number;
  districtId: string;
  createdAt?: number;
  updatedAt?: number;
}

export default function DistrictManagerDashboard() {
  const navigate = useNavigate();
  const { districtId, districtName, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "medicines"
    | "forecast"
    | "allocation"
    | "analytics"
    | "reports"
  >("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [allocations, setAllocations] = useState<MedicineAllocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [savingAllocation, setSavingAllocation] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showAddAllocationModal, setShowAddAllocationModal] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<MedicineRecord | null>(
    null,
  );
  const [aiAnalysis, setAiAnalysis] = useState<StockAnalysisResponse | null>(
    null,
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [allocationForm, setAllocationForm] = useState({
    medicineId: "",
    facilityId: "",
    allocationType: "quantity" as "quantity" | "percentage",
    amount: "",
  });
  const [newMedicine, setNewMedicine] = useState({
    name: "",
    quantity: "",
    unit: "",
    expiryDate: "",
    allocatedQuantity: "",
  });

  // Redirect if not a district manager
  useEffect(() => {
    if (!authLoading && !districtId) {
      navigate("/login");
    }
  }, [authLoading, districtId, navigate]);

  // Fetch district-specific data
  useEffect(() => {
    if (districtId) {
      fetchData();
    }
  }, [districtId]);

  // Generate AI analysis when data changes
  useEffect(() => {
    if (medicines.length > 0 && districtId && districtName) {
      generateAIAnalysis();
    }
  }, [medicines, facilities, allocations, districtId]);

  const generateAIAnalysis = async () => {
    try {
      setAiLoading(true);
      setAiError(null);

      console.log("Generating AI analysis for district:", districtName);

      const analysis = await generateStockAnalysis(
        districtId!,
        districtName!,
        medicines,
        facilities,
        allocations,
      );

      setAiAnalysis(analysis);
      console.log("AI analysis generated successfully");
    } catch (err) {
      console.error("Error generating AI analysis:", err);
      setAiError(
        err instanceof Error
          ? err.message
          : "Failed to generate AI analysis. Using default data.",
      );
      // AI analysis is optional - continue with default data
    } finally {
      setAiLoading(false);
    }
  };

  const fetchData = async () => {
    if (!districtId) {
      console.log("Cannot fetch data: districtId is null or undefined");
      return;
    }

    try {
      setLoading(true);
      console.log("Fetching medicines for districtId:", districtId);

      // Fetch medicines for this district only
      const medicinesQuery = query(
        collection(db, "medicines"),
        where("districtId", "==", districtId),
        orderBy("createdAt", "desc"),
      );
      const medicinesSnapshot = await getDocs(medicinesQuery);
      console.log("Medicines found:", medicinesSnapshot.docs.length);
      const medicinesData = medicinesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          allocatedQuantity: data.allocatedQuantity || 0,
        } as MedicineRecord;
      });
      setMedicines(medicinesData);

      // Fetch facilities for this district only
      const facilitiesQuery = query(
        collection(db, "facilities"),
        where("districtId", "==", districtId),
        orderBy("createdAt", "desc"),
      );
      const facilitiesSnapshot = await getDocs(facilitiesQuery);
      console.log("Facilities found:", facilitiesSnapshot.docs.length);
      const facilitiesData = facilitiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Facility[];
      setFacilities(facilitiesData);

      // Fetch allocations for this district only
      const allocationsQuery = query(
        collection(db, "medicineAllocations"),
        where("districtId", "==", districtId),
        orderBy("createdAt", "desc"),
      );
      const allocationsSnapshot = await getDocs(allocationsQuery);
      const allocationsData = allocationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MedicineAllocation[];
      setAllocations(allocationsData);

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
    }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtId) {
      setError("District ID not found");
      return;
    }
    if (
      !newMedicine.name ||
      !newMedicine.quantity ||
      !newMedicine.unit ||
      !newMedicine.expiryDate ||
      newMedicine.allocatedQuantity === ""
    ) {
      setError("Please fill all medicine fields");
      return;
    }

    const allocatedQty = parseInt(newMedicine.allocatedQuantity);
    const totalQty = parseInt(newMedicine.quantity);
    if (allocatedQty > totalQty) {
      setError("Allocated quantity cannot exceed total quantity");
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
          allocatedQuantity: parseInt(newMedicine.allocatedQuantity),
          updatedAt: now,
        });
        setSuccess("Medicine updated successfully");
        setEditingMedicine(null);
      } else {
        // Add new medicine - automatically assign to this district
        await addDoc(collection(db, "medicines"), {
          name: newMedicine.name,
          quantity: parseInt(newMedicine.quantity),
          unit: newMedicine.unit,
          expiryDate: newMedicine.expiryDate,
          allocatedQuantity: parseInt(newMedicine.allocatedQuantity),
          districtId: districtId,
          districtName: districtName,
          createdAt: now,
          updatedAt: now,
        });
        setSuccess("Medicine added successfully");
      }

      setNewMedicine({
        name: "",
        quantity: "",
        unit: "",
        expiryDate: "",
        allocatedQuantity: "",
      });
      setShowAddMedicineModal(false);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding/updating medicine:", err);
      setError("Failed to add/update medicine");
    } finally {
      setSavingMedicine(false);
    }
  };

  const handleEditMedicine = (medicine: MedicineRecord) => {
    setEditingMedicine(medicine);
    setNewMedicine({
      name: medicine.name,
      quantity: medicine.quantity.toString(),
      unit: medicine.unit,
      expiryDate: medicine.expiryDate,
      allocatedQuantity: medicine.allocatedQuantity.toString(),
    });
    setShowAddMedicineModal(true);
  };

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

  const handleCancelEdit = () => {
    setEditingMedicine(null);
    setNewMedicine({
      name: "",
      quantity: "",
      unit: "",
      expiryDate: "",
      allocatedQuantity: "",
    });
    setShowAddMedicineModal(false);
  };

  // Add Allocation
  const handleAddAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !allocationForm.medicineId ||
      !allocationForm.facilityId ||
      !allocationForm.amount
    ) {
      setError("Please fill all allocation fields");
      return;
    }

    const amount = parseFloat(allocationForm.amount);
    if (amount <= 0) {
      setError("Allocation amount must be greater than 0");
      return;
    }

    // Get medicine and facility names
    const medicine = medicines.find((m) => m.id === allocationForm.medicineId);
    const facility = facilities.find((f) => f.id === allocationForm.facilityId);

    if (!medicine || !facility) {
      setError("Selected medicine or facility not found");
      return;
    }

    // Validate quantity doesn't exceed available stock
    if (allocationForm.allocationType === "quantity") {
      const availableQuantity = medicine.quantity - medicine.allocatedQuantity;
      if (amount > availableQuantity) {
        setError(
          `Cannot allocate more than available quantity (${availableQuantity} available)`,
        );
        return;
      }
    }

    try {
      setSavingAllocation(true);
      const now = Date.now();

      await addDoc(collection(db, "medicineAllocations"), {
        medicineId: allocationForm.medicineId,
        medicineName: medicine.name,
        facilityId: allocationForm.facilityId,
        facilityName: facility.name,
        allocationType: allocationForm.allocationType,
        amount: amount,
        districtId: districtId,
        createdAt: now,
        updatedAt: now,
      });

      setSuccess("Allocation created successfully");
      setAllocationForm({
        medicineId: "",
        facilityId: "",
        allocationType: "quantity",
        amount: "",
      });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error creating allocation:", err);
      setError("Failed to create allocation");
    } finally {
      setSavingAllocation(false);
    }
  };

  // Delete Allocation
  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm("Are you sure you want to remove this allocation?")) return;

    try {
      setSavingAllocation(true);
      await deleteDoc(doc(db, "medicineAllocations", allocationId));
      setSuccess("Allocation deleted successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting allocation:", err);
      setError("Failed to delete allocation");
    } finally {
      setSavingAllocation(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Use AI-generated data if available, otherwise use defaults
  const demandForecastData = aiAnalysis?.demandForecast || [
    { month: "Jan", demand: 4000, forecast: 4200 },
    { month: "Feb", demand: 3500, forecast: 3800 },
    { month: "Mar", demand: 4200, forecast: 4500 },
    { month: "Apr", demand: 4100, forecast: 4300 },
    { month: "May", demand: 4800, forecast: 5000 },
    { month: "Jun", demand: 5200, forecast: 5400 },
  ];

  const stockLevels = aiAnalysis?.stockLevels || [
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

  const allocationRecommendations = aiAnalysis?.allocationRecommendations?.map(
    (rec) => ({
      id: rec.medicine,
      medicine: rec.medicine,
      currentStock: rec.currentStock,
      predictedDemand: rec.predictedDemand,
      recommendedAllocation: rec.recommendedAllocation,
      urgency: rec.urgency,
    }),
  ) || [
    {
      id: "1",
      medicine: "Amoxicillin",
      currentStock: 800,
      predictedDemand: 1200,
      recommendedAllocation: 500,
      urgency: "critical" as const,
    },
    {
      id: "2",
      medicine: "Metformin",
      currentStock: 1200,
      predictedDemand: 1800,
      recommendedAllocation: 700,
      urgency: "high" as const,
    },
    {
      id: "3",
      medicine: "Paracetamol",
      currentStock: 2500,
      predictedDemand: 3200,
      recommendedAllocation: 800,
      urgency: "medium" as const,
    },
    {
      id: "4",
      medicine: "Ibuprofen",
      currentStock: 1800,
      predictedDemand: 2100,
      recommendedAllocation: 400,
      urgency: "low" as const,
    },
  ];

  const comparisonData = aiAnalysis?.comparisonData || [
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
      `Exporting allocation report for ${districtName}...\nThis would generate a PDF with allocation recommendations, demand forecasts, and comparative analysis.`,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
      {/* Error and Success Messages */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 right-4 bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* AI Analysis Status */}
      {aiLoading && (
        <div className="fixed top-4 left-4 bg-blue-500/20 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-transparent rounded-full"></div>
          <span>Generating AI analysis...</span>
        </div>
      )}

      {aiError && aiAnalysis === null && (
        <div className="fixed top-20 left-4 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-lg">
          <p className="text-sm">{aiError}</p>
          <p className="text-xs text-yellow-200 mt-1">
            Using default analysis data
          </p>
        </div>
      )}

      {aiAnalysis && (
        <div className="fixed top-4 left-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
          ✓ AI Analysis Ready
        </div>
      )}

      {/* Add Medicine Modal */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-cyan-500/20 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">
              {editingMedicine ? "Edit Medicine" : "Add Medicine"}
            </h3>
            <form onSubmit={handleAddMedicine} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Medicine Name
                </label>
                <input
                  type="text"
                  value={newMedicine.name}
                  onChange={(e) =>
                    setNewMedicine({ ...newMedicine, name: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., Paracetamol"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  value={newMedicine.quantity}
                  onChange={(e) =>
                    setNewMedicine({ ...newMedicine, quantity: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., 1000"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={newMedicine.unit}
                  onChange={(e) =>
                    setNewMedicine({ ...newMedicine, unit: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., tablets, bottles"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={newMedicine.expiryDate}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      expiryDate: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Allocated Quantity
                </label>
                <input
                  type="number"
                  value={newMedicine.allocatedQuantity}
                  onChange={(e) =>
                    setNewMedicine({
                      ...newMedicine,
                      allocatedQuantity: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., 500"
                />
              </div>
              <div className="text-sm text-slate-400">
                District: <span className="text-cyan-400">{districtName}</span>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={savingMedicine}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingMedicine ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={savingMedicine}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Allocation Modal */}
      {showAddAllocationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-cyan-500/20 rounded-xl p-6 max-w-2xl w-full mx-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">
              Create Allocation
            </h3>
            <form onSubmit={handleAddAllocation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Medicine
                  </label>
                  <select
                    value={allocationForm.medicineId}
                    onChange={(e) =>
                      setAllocationForm({
                        ...allocationForm,
                        medicineId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Select a medicine</option>
                    {medicines.map((medicine) => (
                      <option key={medicine.id} value={medicine.id}>
                        {medicine.name} (
                        {medicine.quantity - medicine.allocatedQuantity}{" "}
                        {medicine.unit} available)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Facility
                  </label>
                  <select
                    value={allocationForm.facilityId}
                    onChange={(e) =>
                      setAllocationForm({
                        ...allocationForm,
                        facilityId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="">Select a facility</option>
                    {facilities
                      .filter((f) => f.status === "active")
                      .map((facility) => (
                        <option key={facility.id} value={facility.id}>
                          {facility.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Allocation Type
                  </label>
                  <select
                    value={allocationForm.allocationType}
                    onChange={(e) =>
                      setAllocationForm({
                        ...allocationForm,
                        allocationType: e.target.value as
                          | "quantity"
                          | "percentage",
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="quantity">Quantity</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Amount (
                    {allocationForm.allocationType === "percentage"
                      ? "%"
                      : "units"}
                    )
                  </label>
                  <input
                    type="number"
                    value={allocationForm.amount}
                    onChange={(e) =>
                      setAllocationForm({
                        ...allocationForm,
                        amount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                    placeholder="Enter amount"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={savingAllocation}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingAllocation ? "Creating..." : "Create Allocation"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddAllocationModal(false);
                    setAllocationForm({
                      medicineId: "",
                      facilityId: "",
                      allocationType: "quantity",
                      amount: "",
                    });
                  }}
                  disabled={savingAllocation}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-cyan-500/10 bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              District Manager Dashboard
            </h1>
            <p className="text-slate-400 text-sm mt-1">{districtName}</p>
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
            { key: "medicines", label: "Medicines" },
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
                    | "medicines"
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
                  Total Quantities
                </div>
                <div className="text-3xl font-bold text-cyan-400">
                  {medicines
                    .reduce((sum, m) => sum + m.quantity, 0)
                    .toLocaleString()}
                </div>
                <p className="text-xs text-slate-500 mt-2">Units in stock</p>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">
                  Medicine Types
                </div>
                <div className="text-3xl font-bold text-emerald-400">
                  {medicines.length}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Different medicines
                </p>
              </div>
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                <div className="text-slate-400 text-sm mb-2">Facilities</div>
                <div className="text-3xl font-bold text-cyan-400">
                  {facilities.length}
                </div>
                <p className="text-xs text-slate-500 mt-2">In your district</p>
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
                {allocationRecommendations.slice(0, 3).map((item) => (
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

            {/* AI Insights */}
            {aiAnalysis?.insights && aiAnalysis.insights.length > 0 && (
              <div className="p-6 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-900/30 to-slate-900/60">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>Medbalance AI Insights</span>
                </h3>
                <div className="space-y-3">
                  {aiAnalysis.insights.slice(0, 4).map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-slate-900/50 border border-purple-500/20"
                    >
                      <p className="text-sm text-slate-300">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Medicines Tab */}
        {activeTab === "medicines" && (
          <div className="space-y-8">
            {/* Medicines Summary */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">Medicines Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/20">
                  <p className="text-slate-400 text-sm">Total Medicines</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">
                    {medicines.length}
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/20">
                  <p className="text-slate-400 text-sm">Total Units</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">
                    {medicines
                      .reduce((sum, m) => sum + m.quantity, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-slate-900/50 rounded-lg border border-cyan-500/20">
                  <p className="text-slate-400 text-sm">Average Units</p>
                  <p className="text-3xl font-bold text-cyan-400 mt-2">
                    {medicines.length > 0
                      ? Math.round(
                          medicines.reduce((sum, m) => sum + m.quantity, 0) /
                            medicines.length,
                        )
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Medicines Management */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">
                  Medicines in {districtName}
                </h3>
                <button
                  onClick={() => {
                    setEditingMedicine(null);
                    setNewMedicine({
                      name: "",
                      quantity: "",
                      unit: "",
                      expiryDate: "",
                      allocatedQuantity: "",
                    });
                    setShowAddMedicineModal(true);
                  }}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg transition-all"
                >
                  + Add Medicine
                </button>
              </div>

              {medicines.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No medicines added yet. Click "Add Medicine" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {medicines.map((medicine) => (
                    <div
                      key={medicine.id}
                      className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-cyan-400 text-lg">
                          {medicine.name}
                        </p>
                        <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Total Quantity
                            </p>
                            <p className="text-slate-200 font-semibold">
                              {medicine.quantity} {medicine.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Allocated
                            </p>
                            <p className="text-cyan-400 font-semibold">
                              {medicine.allocatedQuantity} {medicine.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Available
                            </p>
                            <p className="text-emerald-400 font-semibold">
                              {medicine.quantity - medicine.allocatedQuantity}{" "}
                              {medicine.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Expiry Date
                            </p>
                            <p className="text-slate-200 font-semibold">
                              {medicine.expiryDate}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditMedicine(medicine)}
                          className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all font-semibold text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteMedicine(medicine.id)}
                          className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all font-semibold text-sm"
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
            {/* Create Allocation Button */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddAllocationModal(true)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg transition-all"
              >
                + Create Allocation
              </button>
            </div>

            {/* Active Allocations */}
            <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
              <h3 className="text-lg font-semibold mb-4">Active Allocations</h3>
              {allocations.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  No allocations created yet. Click the "Create Allocation"
                  button to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {allocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-cyan-400">
                          {allocation.medicineName}
                        </p>
                        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Facility
                            </p>
                            <p className="text-slate-200">
                              {allocation.facilityName}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">
                              Allocated
                            </p>
                            <p className="text-slate-200 font-semibold">
                              {allocation.amount}{" "}
                              {allocation.allocationType === "percentage"
                                ? "%"
                                : "units"}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs mb-1">Type</p>
                            <p className="text-emerald-400 font-semibold capitalize">
                              {allocation.allocationType}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAllocation(allocation.id)}
                        disabled={savingAllocation}
                        className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
              {allocationRecommendations.map((item) => (
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
