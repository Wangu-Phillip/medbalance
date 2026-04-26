import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  query,
  collection,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export type UserRole = "admin" | "district_manager" | "facility_manager" | null;

interface AuthContextType {
  user: User | null;
  role: UserRole;
  districtId: string | null;
  districtName: string | null;
  facilityId: string | null;
  facilityName: string | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Fetch user role from Firestore
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnapshot = await getDoc(userDocRef);

          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            const userRole = (userData.role as UserRole) || null;
            setRole(userRole);

            // If district manager, fetch their district ID and name
            if (userRole === "district_manager") {
              try {
                console.log("Fetching manager info for uid:", currentUser.uid);
                const managersQuery = query(
                  collection(db, "managers"),
                  where("uid", "==", currentUser.uid),
                );
                const managersSnapshot = await getDocs(managersQuery);
                console.log("Managers found:", managersSnapshot.docs.length);

                if (!managersSnapshot.empty) {
                  const managerData = managersSnapshot.docs[0].data();
                  console.log("Manager data:", managerData);
                  setDistrictId(managerData.districtId || null);
                  setDistrictName(managerData.districtName || null);
                } else {
                  console.log("No manager record found for this uid");
                  setDistrictId(null);
                  setDistrictName(null);
                }
              } catch (error) {
                console.error("Error fetching manager district info:", error);
                setDistrictId(null);
                setDistrictName(null);
              }
            } else if (userRole === "facility_manager") {
              try {
                console.log("Fetching facility manager info for uid:", currentUser.uid);
                const fmQuery = query(
                  collection(db, "facilityManagers"),
                  where("uid", "==", currentUser.uid),
                );
                const fmSnapshot = await getDocs(fmQuery);
                console.log("Facility managers found:", fmSnapshot.docs.length);

                if (!fmSnapshot.empty) {
                  const fmData = fmSnapshot.docs[0].data();
                  const docId = fmSnapshot.docs[0].id;
                  console.log("Facility manager doc id:", docId);
                  console.log("Facility manager fields:", JSON.stringify(fmData));
                  // Support both camelCase and alternative field name conventions
                  setDistrictId(fmData.districtId || fmData.district_id || null);
                  setDistrictName(fmData.districtName || fmData.district_name || fmData.district || null);
                  setFacilityId(fmData.facilityId || fmData.facility_id || null);
                  setFacilityName(fmData.facilityName || fmData.facility_name || fmData.facility || null);
                } else {
                  console.log("No facility manager record found for this uid");
                  setDistrictId(null);
                  setDistrictName(null);
                  setFacilityId(null);
                  setFacilityName(null);
                }
              } catch (error) {
                console.error("Error fetching facility manager info:", error);
                setDistrictId(null);
                setDistrictName(null);
                setFacilityId(null);
                setFacilityName(null);
              }
            } else {
              setDistrictId(null);
              setDistrictName(null);
              setFacilityId(null);
              setFacilityName(null);
            }
          } else {
            console.warn("User document not found in Firestore");
            setRole(null);
            setDistrictId(null);
            setDistrictName(null);
            setFacilityId(null);
            setFacilityName(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
          setDistrictId(null);
          setDistrictName(null);
          setFacilityId(null);
          setFacilityName(null);
        }
      } else {
        setRole(null);
        setDistrictId(null);
        setDistrictName(null);
        setFacilityId(null);
        setFacilityName(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    user,
    role,
    districtId,
    districtName,
    facilityId,
    facilityName,
    loading,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
