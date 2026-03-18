import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
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
  setDoc,
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
  districtId: string;
  districtName: string;
  createdAt?: number;
  updatedAt?: number;
}

interface MedicineAllocation {
  id: string;
  medicineId: string;
  facilityId: string;
  facilityName: string;
  allocationType: "quantity" | "percentage";
  amount: number;
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

interface Manager {
  id: string;
  name: string;
  email: string;
  uid?: string;
  districtId: string;
  districtName: string;
  createdAt?: number;
  updatedAt?: number;
}

interface FacilityManager {
  id: string;
  name: string;
  email: string;
  uid?: string;
  districtId: string;
  districtName: string;
  facility: string;
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "overview" | "medicines" | "districts" | "facilities" | "managers" | "data"
  >("overview");
  const [loggingOut, setLoggingOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState<MedicineRecord[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [facilityManagers, setFacilityManagers] = useState<FacilityManager[]>(
    [],
  );
  const [allocations, setAllocations] = useState<MedicineAllocation[]>([]);
  const [editingMedicine, setEditingMedicine] = useState<MedicineRecord | null>(
    null,
  );
  const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
  const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [editingFacilityManager, setEditingFacilityManager] =
    useState<FacilityManager | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingMedicine, setSavingMedicine] = useState(false);
  const [savingDistrict, setSavingDistrict] = useState(false);
  const [savingFacility, setSavingFacility] = useState(false);
  const [savingManager, setSavingManager] = useState(false);
  const [showMedicineDatePicker, setShowMedicineDatePicker] = useState(false);
  const [showDistrictDatePicker, setShowDistrictDatePicker] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [adminPassword, setAdminPassword] = useState<string | null>(null);
  const [expandedMedicineId, setExpandedMedicineId] = useState<string | null>(
    null,
  );
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
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
    districtId: "",
  });
  const [newDistrict, setNewDistrict] = useState({ name: "", facilities: "" });
  const [newFacility, setNewFacility] = useState({
    name: "",
    districtId: "",
  });
  const [newManager, setNewManager] = useState({
    name: "",
    email: "",
    districtId: "",
  });
  const [newFacilityManager, setNewFacilityManager] = useState({
    name: "",
    email: "",
    districtId: "",
    facility: "",
  });

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

      // Fetch allocations
      const allocationsSnapshot = await getDocs(
        collection(db, "medicineAllocations"),
      );
      const allocationsData = allocationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MedicineAllocation[];
      setAllocations(allocationsData);

      // Fetch districts
      const districtsSnapshot = await getDocs(
        query(collection(db, "districts"), orderBy("createdAt", "desc")),
      );
      const districtsData = districtsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as District[];
      setDistricts(districtsData);

      // Fetch facilities
      const facilitiesSnapshot = await getDocs(
        query(collection(db, "facilities"), orderBy("createdAt", "desc")),
      );
      const facilitiesData = facilitiesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Facility[];
      setFacilities(facilitiesData);

      // Fetch managers
      const managersSnapshot = await getDocs(
        query(collection(db, "managers"), orderBy("createdAt", "desc")),
      );
      const managersData = managersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Manager[];
      setManagers(managersData);

      // Fetch facility managers
      const facilityManagersSnapshot = await getDocs(
        query(collection(db, "facilityManagers"), orderBy("createdAt", "desc")),
      );
      const facilityManagersData = facilityManagersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FacilityManager[];
      setFacilityManagers(facilityManagersData);

      setError(null);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load data from database");
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create user account and save to users collection
  const createUserAccount = async (
    email: string,
    role: "district_manager" | "facility_manager",
  ): Promise<string | null> => {
    try {
      // Get current admin user first (before any auth changes)
      const currentAdmin = auth.currentUser;
      if (!currentAdmin) {
        setError("You must be logged in as admin to create user accounts");
        return null;
      }

      // Get admin credentials if not already stored
      let adminEmailToUse = adminEmail;
      let adminPasswordToUse = adminPassword;

      if (!adminEmailToUse || !adminPasswordToUse) {
        const adminEmailPrompt = prompt(
          "Enter your admin email to restore session after creating user:",
        );
        const adminPasswordPrompt = prompt("Enter your admin password:");

        if (!adminEmailPrompt || !adminPasswordPrompt) {
          setError("Admin credentials required to create user accounts");
          return null;
        }

        adminEmailToUse = adminEmailPrompt;
        adminPasswordToUse = adminPasswordPrompt;
        setAdminEmail(adminEmailPrompt);
        setAdminPassword(adminPasswordPrompt);
      }

      // Create new user account with default password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        "Password1.",
      );

      const uid = userCredential.user.uid;

      // Immediately sign back in as admin before saving to Firestore
      await signInWithEmailAndPassword(
        auth,
        adminEmailToUse,
        adminPasswordToUse,
      );

      // Now save user to users collection with role (uid as document ID) - as admin
      await setDoc(doc(db, "users", uid), {
        email: email,
        role: role,
        createdAt: Date.now(),
      });

      return uid;
    } catch (err: any) {
      console.error("Error creating user account:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Email already in use. Please use a different email.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email format.");
      } else {
        setError("Failed to create user account. Please try again.");
      }
      return null;
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
      !newMedicine.expiryDate ||
      !newMedicine.districtId
    ) {
      setError("Please fill all medicine fields and select a district");
      return;
    }

    try {
      setSavingMedicine(true);
      const now = Date.now();
      const districtName =
        districts.find((d) => d.id === newMedicine.districtId)?.name || "";

      if (editingMedicine) {
        // Update existing medicine
        await updateDoc(doc(db, "medicines", editingMedicine.id), {
          name: newMedicine.name,
          quantity: parseInt(newMedicine.quantity),
          unit: newMedicine.unit,
          expiryDate: newMedicine.expiryDate,
          districtId: newMedicine.districtId,
          districtName: districtName,
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
          districtId: newMedicine.districtId,
          districtName: districtName,
          createdAt: now,
          updatedAt: now,
        });
        setSuccess("Medicine added successfully to district");
      }
      setNewMedicine({
        name: "",
        quantity: "",
        unit: "",
        expiryDate: "",
        districtId: "",
      });
      setExpandedMedicineId(null);
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
      districtId: medicine.districtId,
    });
    setExpandedMedicineId(medicine.id);
  };

  // Get allocations for a specific medicine
  const getMedicineAllocations = (medicineId: string) => {
    return allocations.filter((a) => a.medicineId === medicineId);
  };

  // Get available facilities for a district
  const getDistrictFacilities = (districtId: string) => {
    return facilities.filter((f) => f.districtId === districtId);
  };

  // Calculate allocated quantity for a medicine
  const calculateAllocatedQuantity = (medicine: MedicineRecord) => {
    const medicineAllocs = getMedicineAllocations(medicine.id);
    let allocated = 0;
    medicineAllocs.forEach((alloc) => {
      if (alloc.allocationType === "quantity") {
        allocated += alloc.amount;
      } else if (alloc.allocationType === "percentage") {
        allocated += (medicine.quantity * alloc.amount) / 100;
      }
    });
    return allocated;
  };

  // Add Medicine Allocation
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

    try {
      setSavingMedicine(true);
      const medicine = medicines.find(
        (m) => m.id === allocationForm.medicineId,
      );
      if (!medicine) {
        setError("Medicine not found");
        return;
      }

      const facility = facilities.find(
        (f) => f.id === allocationForm.facilityId,
      );
      if (!facility) {
        setError("Facility not found");
        return;
      }

      // Validate allocation amount
      if (allocationForm.allocationType === "quantity") {
        const allocated = calculateAllocatedQuantity(medicine);
        if (allocated + parseFloat(allocationForm.amount) > medicine.quantity) {
          setError(
            `Cannot allocate ${allocationForm.amount}. Total allocated would exceed ${medicine.quantity} units.`,
          );
          setSavingMedicine(false);
          return;
        }
      } else if (allocationForm.allocationType === "percentage") {
        if (parseFloat(allocationForm.amount) > 100) {
          setError("Percentage cannot exceed 100%");
          setSavingMedicine(false);
          return;
        }
      }

      // Add allocation
      await addDoc(collection(db, "medicineAllocations"), {
        medicineId: allocationForm.medicineId,
        facilityId: allocationForm.facilityId,
        facilityName: facility.name,
        allocationType: allocationForm.allocationType,
        amount: parseFloat(allocationForm.amount),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setSuccess("Medicine allocated to facility successfully");
      setAllocationForm({
        medicineId: "",
        facilityId: "",
        allocationType: "quantity",
        amount: "",
      });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding allocation:", err);
      setError("Failed to add allocation");
    } finally {
      setSavingMedicine(false);
    }
  };

  // Delete Allocation
  const handleDeleteAllocation = async (allocationId: string) => {
    if (!confirm("Are you sure you want to remove this allocation?")) return;

    try {
      setSavingMedicine(true);
      await deleteDoc(doc(db, "medicineAllocations", allocationId));
      setSuccess("Allocation removed successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting allocation:", err);
      setError("Failed to remove allocation");
    } finally {
      setSavingMedicine(false);
    }
  };

  // Cancel Edit
  const handleCancelEdit = () => {
    setEditingMedicine(null);
    setNewMedicine({
      name: "",
      quantity: "",
      unit: "",
      expiryDate: "",
      districtId: "",
    });
    setExpandedMedicineId(null);
    setShowMedicineDatePicker(false);
    setShowAddMedicineModal(false);
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

  // Add Facility
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.districtId) {
      setError("Please fill all facility fields and select a district");
      return;
    }

    try {
      setSavingFacility(true);
      const now = Date.now();
      const districtName =
        districts.find((d) => d.id === newFacility.districtId)?.name || "";

      if (editingFacility) {
        // Update existing facility
        await updateDoc(doc(db, "facilities", editingFacility.id), {
          name: newFacility.name,
          districtId: newFacility.districtId,
          districtName: districtName,
          updatedAt: now,
        });
        setSuccess("Facility updated successfully");
        setEditingFacility(null);
      } else {
        // Add new facility
        await addDoc(collection(db, "facilities"), {
          name: newFacility.name,
          districtId: newFacility.districtId,
          districtName: districtName,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        setSuccess("Facility added successfully");
      }
      setNewFacility({ name: "", districtId: "" });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding/updating facility:", err);
      setError("Failed to add/update facility");
    } finally {
      setSavingFacility(false);
    }
  };

  // Delete Facility
  const handleDeleteFacility = async (facilityId: string) => {
    if (!confirm("Are you sure you want to delete this facility?")) return;

    try {
      setSavingFacility(true);
      await deleteDoc(doc(db, "facilities", facilityId));
      setSuccess("Facility deleted successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting facility:", err);
      setError("Failed to delete facility");
    } finally {
      setSavingFacility(false);
    }
  };

  // Edit Facility
  const handleEditFacility = (facility: Facility) => {
    setEditingFacility(facility);
    setNewFacility({
      name: facility.name,
      districtId: facility.districtId,
    });
  };

  // Cancel Edit Facility
  const handleCancelEditFacility = () => {
    setEditingFacility(null);
    setNewFacility({ name: "", districtId: "" });
  };

  // Toggle Facility Status
  const handleToggleFacilityStatus = async (facility: Facility) => {
    try {
      setSavingFacility(true);
      const newStatus = facility.status === "active" ? "inactive" : "active";
      await updateDoc(doc(db, "facilities", facility.id), {
        status: newStatus,
        updatedAt: Date.now(),
      });
      setSuccess(`Facility marked as ${newStatus}`);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error updating facility status:", err);
      setError("Failed to update facility status");
    } finally {
      setSavingFacility(false);
    }
  };

  // Add Manager
  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newManager.name || !newManager.email || !newManager.districtId) {
      setError("Please fill all manager fields and select a district");
      return;
    }

    // Check if district already has a manager
    const existingManager = managers.find(
      (m) => m.districtId === newManager.districtId,
    );
    if (existingManager && !editingManager) {
      setError(
        "This district already has a manager. Only 1 manager per district allowed.",
      );
      return;
    }

    try {
      setSavingManager(true);
      const districtName =
        districts.find((d) => d.id === newManager.districtId)?.name || "";
      const now = Date.now();

      if (editingManager) {
        // Update existing manager (no auth changes)
        await updateDoc(doc(db, "managers", editingManager.id), {
          name: newManager.name,
          email: newManager.email,
          districtId: newManager.districtId,
          districtName: districtName,
          updatedAt: now,
        });
        setSuccess("Manager updated successfully");
        setEditingManager(null);
      } else {
        // Create new manager - first create auth account
        const uid = await createUserAccount(
          newManager.email,
          "district_manager",
        );
        if (!uid) {
          setSavingManager(false);
          return;
        }

        // Add manager document to managers collection
        await addDoc(collection(db, "managers"), {
          name: newManager.name,
          email: newManager.email,
          uid: uid,
          districtId: newManager.districtId,
          districtName: districtName,
          createdAt: now,
          updatedAt: now,
        });
        setSuccess("Manager added successfully. Default password: Password1.");
      }
      setNewManager({ name: "", email: "", districtId: "" });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding/updating manager:", err);
      setError("Failed to add/update manager");
    } finally {
      setSavingManager(false);
    }
  };

  // Delete Manager
  const handleDeleteManager = async (managerId: string) => {
    if (!confirm("Are you sure you want to delete this manager?")) return;

    try {
      setSavingManager(true);
      await deleteDoc(doc(db, "managers", managerId));
      setSuccess("Manager deleted successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting manager:", err);
      setError("Failed to delete manager");
    } finally {
      setSavingManager(false);
    }
  };

  // Edit Manager
  const handleEditManager = (manager: Manager) => {
    setEditingManager(manager);
    setNewManager({
      name: manager.name,
      email: manager.email,
      districtId: manager.districtId,
    });
  };

  // Cancel Edit Manager
  const handleCancelEditManager = () => {
    setEditingManager(null);
    setNewManager({ name: "", email: "", districtId: "" });
  };

  // Add Facility Manager
  const handleAddFacilityManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newFacilityManager.name ||
      !newFacilityManager.email ||
      !newFacilityManager.districtId ||
      !newFacilityManager.facility
    ) {
      setError("Please fill all facility manager fields");
      return;
    }

    // Check if facility already has a manager
    const existingFacilityManager = facilityManagers.find(
      (fm) =>
        fm.districtId === newFacilityManager.districtId &&
        fm.facility === newFacilityManager.facility,
    );
    if (existingFacilityManager && !editingFacilityManager) {
      setError(
        "This facility already has a manager. Only 1 facility manager per facility allowed.",
      );
      return;
    }

    try {
      setSavingManager(true);
      const districtName =
        districts.find((d) => d.id === newFacilityManager.districtId)?.name ||
        "";
      const now = Date.now();

      if (editingFacilityManager) {
        // Update existing facility manager (no auth changes)
        await updateDoc(
          doc(db, "facilityManagers", editingFacilityManager.id),
          {
            name: newFacilityManager.name,
            email: newFacilityManager.email,
            districtId: newFacilityManager.districtId,
            districtName: districtName,
            facility: newFacilityManager.facility,
            updatedAt: now,
          },
        );
        setSuccess("Facility manager updated successfully");
        setEditingFacilityManager(null);
      } else {
        // Create new facility manager - first create auth account
        const uid = await createUserAccount(
          newFacilityManager.email,
          "facility_manager",
        );
        if (!uid) {
          setSavingManager(false);
          return;
        }

        // Add facility manager document to facilityManagers collection
        await addDoc(collection(db, "facilityManagers"), {
          name: newFacilityManager.name,
          email: newFacilityManager.email,
          uid: uid,
          districtId: newFacilityManager.districtId,
          districtName: districtName,
          facility: newFacilityManager.facility,
          createdAt: now,
          updatedAt: now,
        });
        setSuccess(
          "Facility manager added successfully. Default password: Password1.",
        );
      }
      setNewFacilityManager({
        name: "",
        email: "",
        districtId: "",
        facility: "",
      });
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error adding/updating facility manager:", err);
      setError("Failed to add/update facility manager");
    } finally {
      setSavingManager(false);
    }
  };

  // Delete Facility Manager
  const handleDeleteFacilityManager = async (facilityManagerId: string) => {
    if (!confirm("Are you sure you want to delete this facility manager?"))
      return;

    try {
      setSavingManager(true);
      await deleteDoc(doc(db, "facilityManagers", facilityManagerId));
      setSuccess("Facility manager deleted successfully");
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error deleting facility manager:", err);
      setError("Failed to delete facility manager");
    } finally {
      setSavingManager(false);
    }
  };

  // Edit Facility Manager
  const handleEditFacilityManager = (facilityManager: FacilityManager) => {
    setEditingFacilityManager(facilityManager);
    setNewFacilityManager({
      name: facilityManager.name,
      email: facilityManager.email,
      districtId: facilityManager.districtId,
      facility: facilityManager.facility,
    });
  };

  // Cancel Edit Facility Manager
  const handleCancelEditFacilityManager = () => {
    setEditingFacilityManager(null);
    setNewFacilityManager({
      name: "",
      email: "",
      districtId: "",
      facility: "",
    });
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
            { key: "facilities", label: "Facilities" },
            { key: "managers", label: "Managers" },
            { key: "data", label: "Data Management" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(
                  tab.key as
                    | "overview"
                    | "medicines"
                    | "districts"
                    | "facilities"
                    | "managers"
                    | "data",
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
                {/* Header with Add Button */}
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-cyan-400">
                    Medicine Inventory
                  </h2>
                  <button
                    onClick={() => {
                      setEditingMedicine(null);
                      setNewMedicine({
                        name: "",
                        quantity: "",
                        unit: "",
                        expiryDate: "",
                        districtId: "",
                      });
                      setShowAddMedicineModal(true);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all"
                  >
                    + Add Medicine
                  </button>
                </div>

                {/* Modal for Add/Edit Medicine */}
                {showAddMedicineModal && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 rounded-xl border border-cyan-500/20 w-full max-w-2xl max-h-96 overflow-y-auto">
                      {/* Modal Header */}
                      <div className="sticky top-0 p-6 border-b border-cyan-500/20 bg-slate-900 flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-cyan-400">
                          {editingMedicine
                            ? "Edit Medicine"
                            : "Add New Medicine"}
                        </h3>
                        <button
                          onClick={() => setShowAddMedicineModal(false)}
                          className="text-slate-400 hover:text-slate-200 text-2xl"
                        >
                          ×
                        </button>
                      </div>

                      {/* Modal Content */}
                      <form
                        onSubmit={handleAddMedicine}
                        className="p-6 space-y-4"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* District Selection */}
                          <select
                            value={newMedicine.districtId}
                            onChange={(e) =>
                              setNewMedicine({
                                ...newMedicine,
                                districtId: e.target.value,
                              })
                            }
                            disabled={savingMedicine}
                            required
                            className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="">-- Select District --</option>
                            {districts.length === 0 ? (
                              <option disabled>No districts available</option>
                            ) : (
                              districts.map((district) => (
                                <option key={district.id} value={district.id}>
                                  {district.name}
                                </option>
                              ))
                            )}
                          </select>

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
                            className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
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
                            disabled={savingMedicine}
                            className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div className="flex gap-2 pt-4">
                          <button
                            type="submit"
                            disabled={savingMedicine}
                            className="flex-1 py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={savingMedicine}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Medicines List by District */}
                {medicines.length === 0 ? (
                  <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 text-center">
                    <p className="text-slate-400">No medicines added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Unassigned Medicines */}
                    {medicines.some((m) => !m.districtId) && (
                      <div className="rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-slate-900/60 overflow-hidden">
                        {/* Unassigned Header */}
                        <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
                          <h4 className="text-lg font-semibold text-yellow-400">
                            Unassigned Medicines
                            <span className="text-sm text-slate-400 font-normal ml-2">
                              ({medicines.filter((m) => !m.districtId).length}{" "}
                              medicines)
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 mt-1">
                            These medicines need to be assigned to a district
                          </p>
                        </div>

                        {/* Unassigned Medicines List */}
                        <div className="space-y-3 p-4">
                          {medicines
                            .filter((m) => !m.districtId)
                            .map((medicine) => (
                              <div
                                key={medicine.id}
                                className="border border-yellow-500/20 rounded-lg bg-slate-900/50 p-4"
                              >
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <p className="font-semibold text-yellow-400">
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
                                      onClick={() => {
                                        handleEditMedicine(medicine);
                                        setShowAddMedicineModal(true);
                                      }}
                                      disabled={savingMedicine}
                                      className="text-cyan-400 hover:text-cyan-300 text-sm px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Assign to District
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDeleteMedicine(medicine.id)
                                      }
                                      disabled={savingMedicine}
                                      className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Assigned Medicines by District */}
                    {districts.map((district) => {
                      const districtMedicines = medicines.filter(
                        (m) => m.districtId === district.id,
                      );
                      if (districtMedicines.length === 0) return null;

                      return (
                        <div
                          key={district.id}
                          className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 overflow-hidden"
                        >
                          {/* District Header */}
                          <div className="p-4 bg-cyan-500/10 border-b border-cyan-500/20">
                            <h4 className="text-lg font-semibold text-cyan-400">
                              {district.name}
                              <span className="text-sm text-slate-400 font-normal ml-2">
                                ({districtMedicines.length} medicines)
                              </span>
                            </h4>
                          </div>

                          {/* Medicines in District */}
                          <div className="space-y-3 p-4">
                            {districtMedicines.map((medicine) => {
                              const medicineAllocations =
                                getMedicineAllocations(medicine.id);
                              const allocatedQty =
                                calculateAllocatedQuantity(medicine);
                              const remainingQty =
                                medicine.quantity - allocatedQty;
                              const isExpanded =
                                expandedMedicineId === medicine.id;

                              return (
                                <div
                                  key={medicine.id}
                                  className={`border rounded-lg transition-all ${
                                    editingMedicine?.id === medicine.id
                                      ? "border-cyan-400 bg-cyan-500/10"
                                      : "border-cyan-500/10 hover:border-cyan-500/30"
                                  }`}
                                >
                                  {/* Medicine Main Info */}
                                  <div className="p-4 bg-slate-900/50">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <p className="font-semibold text-cyan-400">
                                          {medicine.name}
                                        </p>
                                        <p className="text-sm text-slate-400">
                                          Total: {medicine.quantity}{" "}
                                          {medicine.unit} | Allocated:{" "}
                                          {allocatedQty.toFixed(1)} | Remaining:{" "}
                                          <span
                                            className={
                                              remainingQty < 0
                                                ? "text-red-400"
                                                : "text-emerald-400"
                                            }
                                          >
                                            {remainingQty.toFixed(1)}
                                          </span>
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Expires: {medicine.expiryDate}
                                        </p>
                                      </div>
                                      <div className="flex gap-2 flex-wrap justify-end">
                                        <button
                                          onClick={() =>
                                            setExpandedMedicineId(
                                              isExpanded ? null : medicine.id,
                                            )
                                          }
                                          className="text-cyan-400 hover:text-cyan-300 text-sm px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {isExpanded ? "Collapse" : "Manage"}
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleEditMedicine(medicine);
                                            setShowAddMedicineModal(true);
                                          }}
                                          disabled={savingMedicine}
                                          className="text-cyan-400 hover:text-cyan-300 text-sm px-3 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() =>
                                            handleDeleteMedicine(medicine.id)
                                          }
                                          disabled={savingMedicine}
                                          className="text-red-400 hover:text-red-300 text-sm px-3 py-1 rounded bg-red-500/10 hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          Delete
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expanded: Allocations & Allocation Form */}
                                  {isExpanded && (
                                    <div className="border-t border-cyan-500/10 p-4 bg-slate-950/50 space-y-4">
                                      {/* Add Allocation Form */}
                                      <div className="p-4 bg-slate-900/50 border border-cyan-500/10 rounded-lg">
                                        <h5 className="text-sm font-semibold text-cyan-400 mb-3">
                                          Allocate to Facility
                                        </h5>
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <select
                                              value={
                                                allocationForm.medicineId ===
                                                medicine.id
                                                  ? allocationForm.facilityId
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                setAllocationForm({
                                                  ...allocationForm,
                                                  medicineId: medicine.id,
                                                  facilityId: e.target.value,
                                                });
                                              }}
                                              disabled={savingMedicine}
                                              className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                                            >
                                              <option value="">
                                                Select Facility
                                              </option>
                                              {getDistrictFacilities(
                                                district.id,
                                              ).map((facility) => (
                                                <option
                                                  key={facility.id}
                                                  value={facility.id}
                                                >
                                                  {facility.name}
                                                </option>
                                              ))}
                                            </select>

                                            <select
                                              value={
                                                allocationForm.medicineId ===
                                                medicine.id
                                                  ? allocationForm.allocationType
                                                  : "quantity"
                                              }
                                              onChange={(e) => {
                                                setAllocationForm({
                                                  ...allocationForm,
                                                  medicineId: medicine.id,
                                                  allocationType: e.target
                                                    .value as
                                                    | "quantity"
                                                    | "percentage",
                                                });
                                              }}
                                              disabled={savingMedicine}
                                              className="px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded text-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                                            >
                                              <option value="quantity">
                                                Quantity
                                              </option>
                                              <option value="percentage">
                                                Percentage
                                              </option>
                                            </select>
                                          </div>

                                          <div className="flex gap-2">
                                            <input
                                              type="number"
                                              placeholder={
                                                allocationForm.medicineId ===
                                                medicine.id
                                                  ? allocationForm.allocationType ===
                                                    "quantity"
                                                    ? `Amount (max ${remainingQty.toFixed(1)})`
                                                    : "Percentage (0-100)"
                                                  : "Amount"
                                              }
                                              value={
                                                allocationForm.medicineId ===
                                                medicine.id
                                                  ? allocationForm.amount
                                                  : ""
                                              }
                                              onChange={(e) => {
                                                setAllocationForm({
                                                  ...allocationForm,
                                                  medicineId: medicine.id,
                                                  amount: e.target.value,
                                                });
                                              }}
                                              disabled={savingMedicine}
                                              className="flex-1 px-3 py-2 bg-slate-800/50 border border-cyan-500/20 rounded text-slate-50 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50"
                                            />
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                setAllocationForm({
                                                  ...allocationForm,
                                                  medicineId: medicine.id,
                                                });
                                                handleAddAllocation(e as any);
                                              }}
                                              disabled={savingMedicine}
                                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded text-sm transition-all disabled:opacity-50"
                                            >
                                              Allocate
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Allocations List */}
                                      {medicineAllocations.length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-2">
                                          No allocations yet
                                        </p>
                                      ) : (
                                        <div>
                                          <h5 className="text-sm font-semibold text-cyan-400 mb-2">
                                            Facility Allocations
                                          </h5>
                                          <div className="space-y-2">
                                            {medicineAllocations.map(
                                              (alloc) => (
                                                <div
                                                  key={alloc.id}
                                                  className="p-3 bg-slate-800/50 border border-cyan-500/10 rounded flex justify-between items-center text-sm"
                                                >
                                                  <div>
                                                    <p className="text-slate-50">
                                                      {alloc.facilityName}
                                                    </p>
                                                    <p className="text-xs text-slate-400">
                                                      {alloc.allocationType ===
                                                      "quantity"
                                                        ? `${alloc.amount} ${medicine.unit}`
                                                        : `${alloc.amount}%`}
                                                    </p>
                                                  </div>
                                                  <button
                                                    onClick={() =>
                                                      handleDeleteAllocation(
                                                        alloc.id,
                                                      )
                                                    }
                                                    disabled={savingMedicine}
                                                    className="text-red-400 hover:text-red-300 px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-xs disabled:opacity-50"
                                                  >
                                                    Remove
                                                  </button>
                                                </div>
                                              ),
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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

            {/* Facilities Tab */}
            {activeTab === "facilities" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Add Facility Form */}
                  <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                    <h3 className="text-lg font-semibold mb-4">
                      {editingFacility ? "Edit Facility" : "Add New Facility"}
                    </h3>
                    <form onSubmit={handleAddFacility} className="space-y-4">
                      <input
                        type="text"
                        placeholder="Facility Name"
                        value={newFacility.name}
                        onChange={(e) =>
                          setNewFacility({
                            ...newFacility,
                            name: e.target.value,
                          })
                        }
                        disabled={savingFacility}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <select
                        value={newFacility.districtId}
                        onChange={(e) =>
                          setNewFacility({
                            ...newFacility,
                            districtId: e.target.value,
                          })
                        }
                        disabled={savingFacility}
                        className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Select a district</option>
                        {districts.map((district) => (
                          <option key={district.id} value={district.id}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        disabled={savingFacility}
                        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {savingFacility ? (
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
                        ) : editingFacility ? (
                          "Update Facility"
                        ) : (
                          "Add Facility"
                        )}
                      </button>
                      {editingFacility && (
                        <button
                          type="button"
                          onClick={handleCancelEditFacility}
                          disabled={savingFacility}
                          className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      )}
                    </form>
                  </div>

                  {/* Facilities Grid */}
                  <div className="lg:col-span-2">
                    {facilities.length === 0 ? (
                      <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 text-center">
                        <p className="text-slate-400">
                          No facilities added yet
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {facilities.map((facility) => (
                          <div
                            key={facility.id}
                            className={`p-4 rounded-lg border transition-all ${
                              editingFacility?.id === facility.id
                                ? "border-cyan-400 bg-cyan-500/10 bg-gradient-to-br from-cyan-500/10 to-slate-900/60"
                                : "border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60 hover:border-cyan-400"
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-semibold text-cyan-400">
                                  {facility.name}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">
                                  {facility.districtName}
                                </p>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                                  facility.status === "active"
                                    ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                    : "bg-slate-500/20 text-slate-300 hover:bg-slate-500/30"
                                } ${
                                  savingFacility
                                    ? "opacity-50 cursor-not-allowed pointer-events-none"
                                    : ""
                                }`}
                                onClick={() =>
                                  !savingFacility &&
                                  handleToggleFacilityStatus(facility)
                                }
                              >
                                {facility.status}
                              </span>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleEditFacility(facility)}
                                disabled={savingFacility}
                                className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteFacility(facility.id)
                                }
                                disabled={savingFacility}
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

            {/* Managers Tab */}
            {activeTab === "managers" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Manager Management */}
                  <div className="space-y-4">
                    <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                      <h3 className="text-lg font-semibold mb-4">
                        {editingManager
                          ? "Edit Manager"
                          : "Add District Manager"}
                      </h3>
                      <form onSubmit={handleAddManager} className="space-y-4">
                        <input
                          type="text"
                          placeholder="Manager Name"
                          value={newManager.name}
                          onChange={(e) =>
                            setNewManager({
                              ...newManager,
                              name: e.target.value,
                            })
                          }
                          disabled={savingManager}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="email"
                          placeholder="Manager Email"
                          value={newManager.email}
                          onChange={(e) =>
                            setNewManager({
                              ...newManager,
                              email: e.target.value,
                            })
                          }
                          disabled={savingManager}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <select
                          value={newManager.districtId}
                          onChange={(e) =>
                            setNewManager({
                              ...newManager,
                              districtId: e.target.value,
                            })
                          }
                          disabled={savingManager}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select District</option>
                          {districts.map((district) => {
                            const hasManager = managers.some(
                              (m) =>
                                m.districtId === district.id &&
                                m.id !== editingManager?.id,
                            );
                            return (
                              <option
                                key={district.id}
                                value={district.id}
                                disabled={hasManager}
                              >
                                {district.name}
                                {hasManager ? " (Has Manager)" : ""}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="submit"
                          disabled={savingManager}
                          className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {savingManager ? (
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
                          ) : editingManager ? (
                            "Update Manager"
                          ) : (
                            "Add Manager"
                          )}
                        </button>
                        {editingManager && (
                          <button
                            type="button"
                            onClick={handleCancelEditManager}
                            disabled={savingManager}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        )}
                      </form>
                    </div>

                    {/* Managers List */}
                    <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                      <h3 className="text-lg font-semibold mb-4">
                        District Managers ({managers.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {managers.length === 0 ? (
                          <p className="text-slate-400 text-center py-8">
                            No managers added yet
                          </p>
                        ) : (
                          managers.map((manager) => (
                            <div
                              key={manager.id}
                              className={`p-4 bg-slate-900/50 rounded-lg border ${
                                editingManager?.id === manager.id
                                  ? "border-cyan-400 bg-cyan-500/10"
                                  : "border-cyan-500/10"
                              } flex justify-between items-start`}
                            >
                              <div>
                                <p className="font-semibold text-cyan-400">
                                  {manager.name}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {manager.email}
                                </p>
                                <p className="text-xs text-slate-500">
                                  District: {manager.districtName}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditManager(manager)}
                                  disabled={savingManager}
                                  className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteManager(manager.id)
                                  }
                                  disabled={savingManager}
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

                  {/* Facility Manager Management */}
                  <div className="space-y-4">
                    <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                      <h3 className="text-lg font-semibold mb-4">
                        {editingFacilityManager
                          ? "Edit Facility Manager"
                          : "Add Facility Manager"}
                      </h3>
                      <form
                        onSubmit={handleAddFacilityManager}
                        className="space-y-4"
                      >
                        <input
                          type="text"
                          placeholder="Facility Manager Name"
                          value={newFacilityManager.name}
                          onChange={(e) =>
                            setNewFacilityManager({
                              ...newFacilityManager,
                              name: e.target.value,
                            })
                          }
                          disabled={savingManager}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="email"
                          placeholder="Facility Manager Email"
                          value={newFacilityManager.email}
                          onChange={(e) =>
                            setNewFacilityManager({
                              ...newFacilityManager,
                              email: e.target.value,
                            })
                          }
                          disabled={savingManager}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <select
                          value={newFacilityManager.districtId}
                          onChange={(e) =>
                            setNewFacilityManager({
                              ...newFacilityManager,
                              districtId: e.target.value,
                              facility: "",
                            })
                          }
                          disabled={savingManager}
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select District</option>
                          {districts.map((district) => (
                            <option key={district.id} value={district.id}>
                              {district.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={newFacilityManager.facility}
                          onChange={(e) =>
                            setNewFacilityManager({
                              ...newFacilityManager,
                              facility: e.target.value,
                            })
                          }
                          disabled={
                            savingManager || !newFacilityManager.districtId
                          }
                          className="w-full px-3 py-2 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">Select Facility</option>
                          {newFacilityManager.districtId &&
                            getDistrictFacilities(
                              newFacilityManager.districtId,
                            ).map((facility) => (
                              <option key={facility.id} value={facility.name}>
                                {facility.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="submit"
                          disabled={savingManager}
                          className="w-full py-2 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {savingManager ? (
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
                          ) : editingFacilityManager ? (
                            "Update Facility Manager"
                          ) : (
                            "Add Facility Manager"
                          )}
                        </button>
                        {editingFacilityManager && (
                          <button
                            type="button"
                            onClick={handleCancelEditFacilityManager}
                            disabled={savingManager}
                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Cancel
                          </button>
                        )}
                      </form>
                    </div>

                    {/* Facility Managers List */}
                    <div className="p-6 rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/60 to-slate-900/60">
                      <h3 className="text-lg font-semibold mb-4">
                        Facility Managers ({facilityManagers.length})
                      </h3>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {facilityManagers.length === 0 ? (
                          <p className="text-slate-400 text-center py-8">
                            No facility managers added yet
                          </p>
                        ) : (
                          facilityManagers.map((fm) => (
                            <div
                              key={fm.id}
                              className={`p-4 bg-slate-900/50 rounded-lg border ${
                                editingFacilityManager?.id === fm.id
                                  ? "border-cyan-400 bg-cyan-500/10"
                                  : "border-cyan-500/10"
                              } flex justify-between items-start`}
                            >
                              <div>
                                <p className="font-semibold text-cyan-400">
                                  {fm.name}
                                </p>
                                <p className="text-sm text-slate-400">
                                  {fm.email}
                                </p>
                                <p className="text-xs text-slate-500">
                                  District: {fm.districtName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  Facility: {fm.facility}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditFacilityManager(fm)}
                                  disabled={savingManager}
                                  className="text-cyan-400 hover:text-cyan-300 text-sm px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteFacilityManager(fm.id)
                                  }
                                  disabled={savingManager}
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
