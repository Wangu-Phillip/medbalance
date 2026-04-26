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
  onSnapshot,
  query,
  orderBy,
  where,
  increment,
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
  dosageForm?: string;
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

interface MedicineRequest {
  id: string;
  medicineName: string;
  dosageForm: string;
  requestedQuantity: number;
  unit: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  facilityId?: string;
  facilityName?: string;
  districtId: string;
  districtName: string;
  createdAt?: number;
  updatedAt?: number;
}

interface ConsumptionRecord {
  id: string;
  medicineName: string;
  quantity: number;
  unit: string;
  date: string;
  patientCount?: number;
  notes?: string;
  facilityId: string;
  facilityName: string;
  districtId: string;
  districtName: string;
  createdAt?: number;
}

export default function DistrictManagerDashboard() {
  const navigate = useNavigate();
  const { districtId, districtName, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "medicines"
    | "facilities"
    | "forecast"
    | "allocation"
    | "analytics"
    | "requests"
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
    dosageForm: "",
    expiryDate: "",
    allocatedQuantity: "",
  });

  // Cache management constants
  const AI_CACHE_KEY = `ai_analysis_${districtId}`;
  const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
  const [requests, setRequests] = useState<MedicineRequest[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [newRequest, setNewRequest] = useState({
    medicineName: "",
    dosageForm: "",
    requestedQuantity: "",
    unit: "",
    reason: "",
  });
  const [savingRequest, setSavingRequest] = useState(false);
  const [consumptionRecords, setConsumptionRecords] = useState<ConsumptionRecord[]>([]);
  const [expandedFacilityId, setExpandedFacilityId] = useState<string | null>(null);

  // Approve-request modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<MedicineRequest | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveFacilityId, setApproveFacilityId] = useState("");
  const [savingApproval, setSavingApproval] = useState(false);

  // Redirect if not a district manager
  useEffect(() => {
    if (!authLoading && !districtId) {
      navigate("/login");
    }
  }, [authLoading, districtId, navigate]);

  // Set up real-time data listeners
  useEffect(() => {
    if (!districtId) return;

    setLoading(true);
    const cacheKey = `ai_analysis_${districtId}`;
    let loadedCount = 0;
    const LISTENER_COUNT = 4;

    const onListenerReady = () => {
      loadedCount++;
      if (loadedCount >= LISTENER_COUNT) setLoading(false);
    };

    const medicinesQuery = query(
      collection(db, "medicines"),
      where("districtId", "==", districtId),
      orderBy("createdAt", "desc"),
    );
    const unsubMedicines = onSnapshot(
      medicinesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const rec = d.data();
          return { id: d.id, ...rec, allocatedQuantity: rec.allocatedQuantity || 0 } as MedicineRecord;
        });
        setMedicines(data);
        localStorage.removeItem(cacheKey);
        onListenerReady();
      },
      (err) => {
        console.error("Error listening to medicines:", err);
        setError("Failed to load medicines");
        onListenerReady();
      },
    );

    const facilitiesQuery = query(
      collection(db, "facilities"),
      where("districtId", "==", districtId),
      orderBy("createdAt", "desc"),
    );
    const unsubFacilities = onSnapshot(
      facilitiesQuery,
      (snapshot) => {
        setFacilities(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Facility[]);
        onListenerReady();
      },
      (err) => {
        console.error("Error listening to facilities:", err);
        onListenerReady();
      },
    );

    const allocationsQuery = query(
      collection(db, "medicineAllocations"),
      where("districtId", "==", districtId),
      orderBy("createdAt", "desc"),
    );
    const unsubAllocations = onSnapshot(
      allocationsQuery,
      (snapshot) => {
        setAllocations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MedicineAllocation[]);
        onListenerReady();
      },
      (err) => {
        console.error("Error listening to allocations:", err);
        onListenerReady();
      },
    );

    const requestsQuery = query(
      collection(db, "medicineRequests"),
      where("districtId", "==", districtId),
      orderBy("createdAt", "desc"),
    );
    const unsubRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as MedicineRequest[]);
      },
      (err) => console.error("Error listening to requests:", err),
    );

    const consumptionQuery = query(
      collection(db, "consumptionRecords"),
      where("districtId", "==", districtId),
      orderBy("createdAt", "desc"),
    );
    const unsubConsumption = onSnapshot(
      consumptionQuery,
      (snapshot) => {
        setConsumptionRecords(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as ConsumptionRecord[]);
        onListenerReady();
      },
      (err) => {
        console.error("Error listening to consumption records:", err);
        onListenerReady();
      },
    );

    return () => {
      unsubMedicines();
      unsubFacilities();
      unsubAllocations();
      unsubRequests();
      unsubConsumption();
    };
  }, [districtId]);

  // Load cached AI analysis on mount
  useEffect(() => {
    if (districtId) {
      const cachedData = localStorage.getItem(AI_CACHE_KEY);
      if (cachedData) {
        try {
          const { analysis, timestamp } = JSON.parse(cachedData);
          const isStale = Date.now() - timestamp > CACHE_DURATION_MS;
          if (!isStale) {
            setAiAnalysis(analysis);
            console.log("Loaded AI analysis from cache");
          } else {
            localStorage.removeItem(AI_CACHE_KEY);
          }
        } catch (err) {
          console.error("Error loading cached AI analysis:", err);
          localStorage.removeItem(AI_CACHE_KEY);
        }
      }
    }
  }, [districtId]);

  // Generate AI analysis only when data meaningfully changes
  useEffect(() => {
    if (medicines.length > 0 && districtId && districtName) {
      // Check if we have cached data that's still fresh
      const cachedData = localStorage.getItem(AI_CACHE_KEY);
      const hasFreshCache =
        cachedData &&
        (() => {
          try {
            const { timestamp } = JSON.parse(cachedData);
            return Date.now() - timestamp <= CACHE_DURATION_MS;
          } catch {
            return false;
          }
        })();

      // Only regenerate if cache is missing or stale
      if (!hasFreshCache) {
        generateAIAnalysis();
      }
    }
  }, [medicines, facilities, allocations, districtId, districtName]);

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

      // Cache the analysis with timestamp
      try {
        localStorage.setItem(
          AI_CACHE_KEY,
          JSON.stringify({
            analysis,
            timestamp: Date.now(),
          }),
        );
        console.log("AI analysis cached successfully");
      } catch (cacheErr) {
        console.warn("Failed to cache AI analysis:", cacheErr);
      }

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
          dosageForm: newMedicine.dosageForm,
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
          dosageForm: newMedicine.dosageForm,
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
        dosageForm: "",
        expiryDate: "",
        allocatedQuantity: "",
      });
      setShowAddMedicineModal(false);
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
      dosageForm: medicine.dosageForm || "",
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
      dosageForm: "",
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

      // Keep medicine's allocatedQuantity field in sync
      if (allocationForm.allocationType === "quantity") {
        await updateDoc(doc(db, "medicines", allocationForm.medicineId), {
          allocatedQuantity: increment(amount),
          updatedAt: now,
        });
      }

      setSuccess("Allocation created successfully");
      setAllocationForm({
        medicineId: "",
        facilityId: "",
        allocationType: "quantity",
        amount: "",
      });
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

    const allocation = allocations.find((a) => a.id === allocationId);

    try {
      setSavingAllocation(true);
      await deleteDoc(doc(db, "medicineAllocations", allocationId));

      // Decrement the medicine's allocatedQuantity when a quantity-based allocation is deleted
      if (allocation && allocation.allocationType === "quantity") {
        await updateDoc(doc(db, "medicines", allocation.medicineId), {
          allocatedQuantity: increment(-allocation.amount),
          updatedAt: Date.now(),
        });
      }

      setSuccess("Allocation deleted successfully");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting allocation:", err);
      setError("Failed to delete allocation");
    } finally {
      setSavingAllocation(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!districtId || !newRequest.medicineName || !newRequest.requestedQuantity || !newRequest.unit) {
      setError("Please fill all required fields (medicine name, quantity, unit)");
      return;
    }
    try {
      setSavingRequest(true);
      await addDoc(collection(db, "medicineRequests"), {
        medicineName: newRequest.medicineName,
        dosageForm: newRequest.dosageForm,
        requestedQuantity: parseInt(newRequest.requestedQuantity),
        unit: newRequest.unit,
        reason: newRequest.reason,
        status: "pending",
        districtId: districtId,
        districtName: districtName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setSuccess("Request submitted successfully");
      setNewRequest({ medicineName: "", dosageForm: "", requestedQuantity: "", unit: "", reason: "" });
      setShowRequestModal(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error submitting request:", err);
      setError("Failed to submit request");
    } finally {
      setSavingRequest(false);
    }
  };

  // Open the approve-and-allocate modal
  const handleApproveRequest = (req: MedicineRequest) => {
    setApprovingRequest(req);
    setApproveFacilityId(req.facilityId || "");
    setApproveAmount(String(req.requestedQuantity));
    setShowApproveModal(true);
  };

  // Confirm approval: validate stock, create allocation, update medicine, mark request approved
  const handleConfirmApproval = async () => {
    if (!approvingRequest) return;
    const amount = parseFloat(approveAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid allocation amount.");
      return;
    }

    const medicine = medicines.find(
      (m) => m.name.toLowerCase() === approvingRequest.medicineName.toLowerCase()
    );

    if (medicine) {
      const available = medicine.quantity - (medicine.allocatedQuantity || 0);
      if (amount > available) {
        setError(
          `Insufficient stock. Only ${available} ${medicine.unit} available after existing allocations.`
        );
        return;
      }
    }

    try {
      setSavingApproval(true);
      const now = Date.now();

      // Create allocation record
      await addDoc(collection(db, "medicineAllocations"), {
        medicineId: medicine?.id || "",
        medicineName: approvingRequest.medicineName,
        facilityId: approvingRequest.facilityId || approveFacilityId,
        facilityName: approvingRequest.facilityName || "",
        allocationType: "quantity",
        amount: amount,
        districtId: districtId,
        sourceRequestId: approvingRequest.id,
        createdAt: now,
        updatedAt: now,
      });

      // Update medicine's allocatedQuantity if found in district stock
      if (medicine) {
        await updateDoc(doc(db, "medicines", medicine.id), {
          allocatedQuantity: increment(amount),
          updatedAt: now,
        });
      }

      // Mark the request as approved
      await updateDoc(doc(db, "medicineRequests", approvingRequest.id), {
        status: "approved",
        allocatedAmount: amount,
        updatedAt: now,
      });

      setSuccess(`Request approved and ${amount} ${approvingRequest.unit || ""} allocated to ${approvingRequest.facilityName || "facility"}.`);
      setTimeout(() => setSuccess(null), 4000);
      setShowApproveModal(false);
      setApprovingRequest(null);
      setApproveAmount("");
    } catch (err) {
      console.error("Error approving request:", err);
      setError("Failed to approve request");
    } finally {
      setSavingApproval(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to reject this request?")) return;
    try {
      await updateDoc(doc(db, "medicineRequests", requestId), {
        status: "rejected",
        updatedAt: Date.now(),
      });
      setSuccess("Request rejected");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error rejecting request:", err);
      setError("Failed to reject request");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Use AI-generated data if available, otherwise empty
  const demandForecastData = aiAnalysis?.demandForecast || [];

  const stockLevels = aiAnalysis?.stockLevels || [];

  const allocationRecommendations =
    aiAnalysis?.allocationRecommendations?.map((rec) => ({
      id: rec.medicine,
      medicine: rec.medicine,
      currentStock: rec.currentStock,
      predictedDemand: rec.predictedDemand,
      recommendedAllocation: rec.recommendedAllocation,
      urgency: rec.urgency,
    })) || [];

  const comparisonData = aiAnalysis?.comparisonData || [];

  const stockTrendData: Array<{ week: string; stock: number; usage: number }> =
    [];

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
        <div className="fixed top-24 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-24 right-4 z-50 bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* AI Analysis Status */}
      {aiLoading && (
        <div className="fixed top-24 right-4 z-50 bg-blue-500/20 border border-blue-500/30 text-blue-300 px-4 py-3 rounded-lg flex items-center gap-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-300 border-t-transparent rounded-full"></div>
          <span>Generating AI analysis...</span>
        </div>
      )}

      {aiError && aiAnalysis === null && (
        <div className="fixed top-32 right-4 z-50 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-4 py-3 rounded-lg">
          <p className="text-sm">{aiError}</p>
          <p className="text-xs text-yellow-200 mt-1">
            Using default analysis data
          </p>
        </div>
      )}

      {aiAnalysis && (
        <div className="fixed top-24 right-4 z-50 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-lg text-sm">
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
                  placeholder="e.g., 500mg, bottles"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Dosage Form
                </label>
                <select
                  value={newMedicine.dosageForm}
                  onChange={(e) =>
                    setNewMedicine({ ...newMedicine, dosageForm: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Select Dosage Form --</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Powder">Powder</option>
                  <option value="Injection">Injection</option>
                  <option value="Drops">Drops</option>
                  <option value="Cream/Ointment">Cream/Ointment</option>
                  <option value="Other">Other</option>
                </select>
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

      {/* New Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-cyan-500/20 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">
              Request Medicine from Central Store
            </h3>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  value={newRequest.medicineName}
                  onChange={(e) => setNewRequest({ ...newRequest, medicineName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                  placeholder="e.g., Paracetamol"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Dosage Form
                </label>
                <select
                  value={newRequest.dosageForm}
                  onChange={(e) => setNewRequest({ ...newRequest, dosageForm: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="">-- Select Dosage Form --</option>
                  <option value="Tablet">Tablet</option>
                  <option value="Capsule">Capsule</option>
                  <option value="Syrup">Syrup</option>
                  <option value="Powder">Powder</option>
                  <option value="Injection">Injection</option>
                  <option value="Drops">Drops</option>
                  <option value="Cream/Ointment">Cream/Ointment</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    value={newRequest.requestedQuantity}
                    onChange={(e) => setNewRequest({ ...newRequest, requestedQuantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                    placeholder="e.g., 500"
                    required
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    Unit *
                  </label>
                  <input
                    type="text"
                    value={newRequest.unit}
                    onChange={(e) => setNewRequest({ ...newRequest, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400"
                    placeholder="e.g., tablets"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">
                  Reason / Justification
                </label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-cyan-500/20 rounded-lg text-white focus:outline-none focus:border-cyan-400 resize-none"
                  placeholder="e.g., Stock depleted due to increased patient demand"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={savingRequest}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingRequest ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(false);
                    setNewRequest({ medicineName: "", dosageForm: "", requestedQuantity: "", unit: "", reason: "" });
                  }}
                  disabled={savingRequest}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Approve & Allocate Modal */}
      {showApproveModal && approvingRequest && (() => {
        const med = medicines.find(
          (m) => m.name.toLowerCase() === approvingRequest.medicineName.toLowerCase()
        );
        const available = med ? med.quantity - (med.allocatedQuantity || 0) : null;
        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-800 border border-emerald-500/20 rounded-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-emerald-400 mb-1">
                Approve Request &amp; Allocate Stock
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                {approvingRequest.facilityName || "Facility"} &mdash; {approvingRequest.medicineName}
              </p>

              <div className="bg-slate-700/40 rounded-lg p-4 mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Requested quantity</span>
                  <span className="text-white font-medium">
                    {approvingRequest.requestedQuantity} {approvingRequest.unit}
                  </span>
                </div>
                {available !== null ? (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available in district</span>
                    <span className={available < Number(approvingRequest.requestedQuantity) ? "text-red-400 font-medium" : "text-emerald-400 font-medium"}>
                      {available} {med?.unit}
                    </span>
                  </div>
                ) : (
                  <p className="text-amber-400 text-xs">
                    Medicine not found in district stock — approval will be recorded without a stock allocation.
                  </p>
                )}
                {approvingRequest.reason && (
                  <div className="pt-1 border-t border-slate-600 mt-2">
                    <span className="text-slate-400">Reason: </span>
                    <span className="text-slate-300">{approvingRequest.reason}</span>
                  </div>
                )}
              </div>

              {available !== null && (
                <div className="mb-4">
                  <label className="block text-sm text-slate-300 mb-1">
                    Amount to allocate *
                  </label>
                  <input
                    type="number"
                    value={approveAmount}
                    onChange={(e) => setApproveAmount(e.target.value)}
                    min="0"
                    max={available}
                    className="w-full px-3 py-2 bg-slate-700 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-400"
                  />
                  {Number(approveAmount) > available && (
                    <p className="text-red-400 text-xs mt-1">
                      Exceeds available stock ({available} {med?.unit})
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmApproval}
                  disabled={savingApproval || (available !== null && Number(approveAmount) > available) || (available !== null && Number(approveAmount) <= 0)}
                  className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingApproval ? "Processing..." : "Confirm Approval"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowApproveModal(false); setApprovingRequest(null); setApproveAmount(""); }}
                  disabled={savingApproval}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
            { key: "facilities", label: "Facilities" },
            { key: "forecast", label: "Demand Forecast" },
            { key: "allocation", label: "Allocations" },
            { key: "analytics", label: "Analytics" },
            { key: "requests", label: "Requests" },
            { key: "reports", label: "Reports" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as
                    | "overview"
                    | "medicines"
                    | "facilities"
                    | "forecast"
                    | "allocation"
                    | "analytics"
                    | "requests"
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
                      dosageForm: "",
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-cyan-400 text-lg">
                            {medicine.name}
                          </p>
                          {medicine.dosageForm && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {medicine.dosageForm}
                            </span>
                          )}
                        </div>
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

        {/* Facilities Tab */}
        {activeTab === "facilities" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-cyan-400">Facilities in {districtName}</h2>
              <p className="text-sm text-slate-400 mt-1">
                Allocations, consumption records, and requests for each facility
              </p>
            </div>

            {facilities.length === 0 ? (
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 text-center">
                <p className="text-slate-400 py-4">No facilities found in your district.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {facilities.map((facility) => {
                  const facilityAllocations = allocations.filter((a) => a.facilityId === facility.id);
                  const facilityConsumption = consumptionRecords.filter((c) => c.facilityId === facility.id);
                  const facilityRequests = requests.filter((r) => r.facilityId === facility.id);
                  const pendingCount = facilityRequests.filter((r) => r.status === "pending").length;
                  const totalAllocatedUnits = facilityAllocations
                    .filter((a) => a.allocationType === "quantity")
                    .reduce((s, a) => s + a.amount, 0);
                  const totalConsumed = facilityConsumption.reduce((s, c) => s + c.quantity, 0);
                  const isExpanded = expandedFacilityId === facility.id;

                  return (
                    <div
                      key={facility.id}
                      className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden"
                    >
                      {/* Facility header */}
                      <div className="p-4 sm:p-6 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-slate-100">{facility.name}</h3>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                                facility.status === "active"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : "bg-slate-500/20 text-slate-400"
                              }`}
                            >
                              {facility.status}
                            </span>
                            {pendingCount > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-300 font-semibold">
                                {pendingCount} pending request{pendingCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                            <div className="p-2 bg-slate-900/50 rounded-lg">
                              <p className="text-xs text-slate-400">Allocations</p>
                              <p className="text-base font-bold text-cyan-400">{facilityAllocations.length}</p>
                            </div>
                            <div className="p-2 bg-slate-900/50 rounded-lg">
                              <p className="text-xs text-slate-400">Total Allocated</p>
                              <p className="text-base font-bold text-cyan-400">{totalAllocatedUnits} units</p>
                            </div>
                            <div className="p-2 bg-slate-900/50 rounded-lg">
                              <p className="text-xs text-slate-400">Total Consumed</p>
                              <p className="text-base font-bold text-amber-400">{totalConsumed} units</p>
                            </div>
                            <div className="p-2 bg-slate-900/50 rounded-lg">
                              <p className="text-xs text-slate-400">Requests</p>
                              <p className="text-base font-bold text-slate-200">{facilityRequests.length}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setAllocationForm((prev) => ({ ...prev, facilityId: facility.id }));
                              setShowAddAllocationModal(true);
                            }}
                            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg text-sm transition-all whitespace-nowrap"
                          >
                            Allocate Medicine
                          </button>
                          <button
                            onClick={() => setExpandedFacilityId(isExpanded ? null : facility.id)}
                            className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-all whitespace-nowrap"
                          >
                            {isExpanded ? "Hide Details" : "View Details"}
                          </button>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="border-t border-slate-700/50 p-4 sm:p-6 space-y-6">
                          {/* Allocations */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-3">Current Allocations</h4>
                            {facilityAllocations.length === 0 ? (
                              <p className="text-slate-500 text-sm">No allocations yet.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-700/50">
                                      <th className="text-left py-2 pr-4">Medicine</th>
                                      <th className="text-right py-2 pr-4">Amount</th>
                                      <th className="text-right py-2">Type</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {facilityAllocations.map((a) => (
                                      <tr key={a.id} className="border-b border-slate-700/30">
                                        <td className="py-2 pr-4 font-medium text-cyan-400">{a.medicineName}</td>
                                        <td className="py-2 pr-4 text-right text-slate-200">
                                          {a.amount} {a.allocationType === "percentage" ? "%" : "units"}
                                        </td>
                                        <td className="py-2 text-right text-slate-400 capitalize">{a.allocationType}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* Recent Consumption */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-3">Recent Consumption</h4>
                            {facilityConsumption.length === 0 ? (
                              <p className="text-slate-500 text-sm">No consumption records yet.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="text-slate-400 border-b border-slate-700/50">
                                      <th className="text-left py-2 pr-4">Date</th>
                                      <th className="text-left py-2 pr-4">Medicine</th>
                                      <th className="text-right py-2 pr-4">Qty</th>
                                      <th className="text-right py-2">Patients</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {facilityConsumption.slice(0, 5).map((c) => (
                                      <tr key={c.id} className="border-b border-slate-700/30">
                                        <td className="py-2 pr-4 text-slate-400">{c.date}</td>
                                        <td className="py-2 pr-4 font-medium">{c.medicineName}</td>
                                        <td className="py-2 pr-4 text-right text-amber-400">
                                          {c.quantity} {c.unit}
                                        </td>
                                        <td className="py-2 text-right text-slate-300">{c.patientCount || "—"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {facilityConsumption.length > 5 && (
                                  <p className="text-xs text-slate-500 mt-2">
                                    Showing 5 of {facilityConsumption.length} records
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Requests */}
                          {facilityRequests.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-slate-300 mb-3">Medicine Requests</h4>
                              <div className="space-y-2">
                                {facilityRequests.map((req) => (
                                  <div
                                    key={req.id}
                                    className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 flex items-center justify-between gap-3"
                                  >
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{req.medicineName}</span>
                                        <span className="text-sm text-slate-300">
                                          {req.requestedQuantity} {req.unit}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                                            req.status === "approved"
                                              ? "bg-emerald-500/20 text-emerald-300"
                                              : req.status === "rejected"
                                              ? "bg-red-500/20 text-red-300"
                                              : "bg-yellow-500/20 text-yellow-300"
                                          }`}
                                        >
                                          {req.status.toUpperCase()}
                                        </span>
                                      </div>
                                      {req.reason && (
                                        <p className="text-xs text-slate-400 mt-1">{req.reason}</p>
                                      )}
                                    </div>
                                    {req.status === "pending" && (
                                      <div className="flex gap-2 shrink-0">
                                        <button
                                          onClick={() => handleApproveRequest(req)}
                                          className="px-2 py-1 bg-emerald-500/20 text-emerald-300 rounded text-xs font-semibold hover:bg-emerald-500/30 transition-all"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          onClick={() => handleRejectRequest(req.id)}
                                          className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs font-semibold hover:bg-red-500/30 transition-all"
                                        >
                                          Reject
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === "requests" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-cyan-400">Medicine Requests</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Requests from facilities and your requests to the central store
                </p>
              </div>
              <button
                onClick={() => setShowRequestModal(true)}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-semibold rounded-lg transition-all"
              >
                + Request from Central Store
              </button>
            </div>

            {/* Facility Requests */}
            {(() => {
              const facilityRequests = requests.filter((r) => r.facilityId);
              const pendingFacilityRequests = facilityRequests.filter((r) => r.status === "pending");
              return (
                <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Requests from Facilities</h3>
                    {pendingFacilityRequests.length > 0 && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-300 font-semibold">
                        {pendingFacilityRequests.length} pending
                      </span>
                    )}
                  </div>
                  {facilityRequests.length === 0 ? (
                    <p className="text-slate-400 text-sm py-4 text-center">
                      No requests from facilities yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {facilityRequests.map((req) => (
                        <div
                          key={req.id}
                          className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10 flex items-start justify-between gap-3"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              <p className="font-semibold text-cyan-400">{req.medicineName}</p>
                              {req.dosageForm && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                                  {req.dosageForm}
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                                  req.status === "approved"
                                    ? "bg-emerald-500/20 text-emerald-300"
                                    : req.status === "rejected"
                                    ? "bg-red-500/20 text-red-300"
                                    : "bg-yellow-500/20 text-yellow-300"
                                }`}
                              >
                                {req.status.toUpperCase()}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                              <div>
                                <p className="text-slate-400 text-xs">Facility</p>
                                <p className="text-slate-200 font-medium">{req.facilityName || "—"}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Requested Qty</p>
                                <p className="text-slate-200 font-semibold">
                                  {req.requestedQuantity} {req.unit}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Reason</p>
                                <p className="text-slate-300 text-xs">{req.reason || "—"}</p>
                              </div>
                              <div>
                                <p className="text-slate-400 text-xs">Submitted</p>
                                <p className="text-slate-300 text-xs">
                                  {new Date(req.createdAt || 0).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                          {req.status === "pending" && (
                            <div className="flex flex-col gap-2 shrink-0">
                              <button
                                onClick={() => handleApproveRequest(req)}
                                className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all text-xs font-semibold whitespace-nowrap"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRequest(req.id)}
                                className="px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all text-xs font-semibold whitespace-nowrap"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* District manager's own requests to central store */}
            {(() => {
              const myRequests = requests.filter((r) => !r.facilityId);
              return myRequests.length > 0 ? (
                <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                  <h3 className="text-lg font-semibold mb-4">My Requests to Central Store</h3>
                  <div className="space-y-3">
                    {myRequests.map((req) => (
                      <div
                        key={req.id}
                        className="p-4 rounded-lg bg-slate-900/50 border border-cyan-500/10"
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <p className="font-semibold text-cyan-400">{req.medicineName}</p>
                          {req.dosageForm && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                              {req.dosageForm}
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                              req.status === "approved"
                                ? "bg-emerald-500/20 text-emerald-300"
                                : req.status === "rejected"
                                ? "bg-red-500/20 text-red-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-slate-400 text-xs">Requested Qty</p>
                            <p className="text-slate-200 font-semibold">
                              {req.requestedQuantity} {req.unit}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Reason</p>
                            <p className="text-slate-300 text-xs">{req.reason || "—"}</p>
                          </div>
                          <div>
                            <p className="text-slate-400 text-xs">Submitted</p>
                            <p className="text-slate-300 text-xs">
                              {new Date(req.createdAt || 0).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {requests.length === 0 && (
              <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 text-center">
                <p className="text-slate-400 py-4">
                  No requests yet. Facility managers can submit requests from their dashboards, or click "+ Request from Central Store" above.
                </p>
              </div>
            )}
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
