import { useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebaseConfig";

interface LoginPageProps {
  onLoginSuccess?: (user: User) => void;
}

type UserRole = "admin" | "district_manager" | "facility_manager" | null;

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          // Fetch user role from Firestore
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnapshot = await getDoc(userDocRef);

          if (userDocSnapshot.exists()) {
            const userData = userDocSnapshot.data();
            const role = userData.role as UserRole;
            setUserRole(role);

            // Auto-redirect based on role
            if (role === "admin") {
              setRedirecting(true);
              navigate("/admin");
            } else if (role === "district_manager") {
              setRedirecting(true);
              navigate("/district-manager");
            } else if (role === "facility_manager") {
              setRedirecting(true);
              navigate("/facility-manager");
            }
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
        }
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchUserRole = async (uid: string): Promise<UserRole> => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDocSnapshot = await getDoc(userDocRef);

      if (userDocSnapshot.exists()) {
        const userData = userDocSnapshot.data();
        return (userData.role as UserRole) || null;
      }
      return null;
    } catch (err) {
      console.error("Error fetching user role:", err);
      return null;
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      // Set persistence to local storage
      await setPersistence(auth, browserLocalPersistence);

      // Sign in the user
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      // Fetch user role from Firestore
      const role = await fetchUserRole(userCredential.user.uid);

      if (!role) {
        setError("User role not found. Please contact an administrator.");
        setLoading(false);
        // Sign out the user since they don't have a role
        await signOut(auth);
        return;
      }

      setUserRole(role);

      // Clear form
      setEmail("");
      setPassword("");

      // Call the callback if provided
      if (onLoginSuccess) {
        onLoginSuccess(userCredential.user);
      }

      // Redirect based on role
      setRedirecting(true);
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "district_manager") {
        navigate("/district-manager");
      } else if (role === "facility_manager") {
        navigate("/facility-manager");
      }
    } catch (err: any) {
      // Handle Firebase errors
      let errorMessage = "Authentication failed";

      if (err.code === "auth/user-not-found") {
        errorMessage = "No account found with this email address";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed login attempts. Please try again later";
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setEmail("");
      setPassword("");
      setError("");
      setUserRole(null);
      setRedirecting(false);
    } catch (err) {
      setError("Failed to log out");
    }
  };

  // Show loading state while redirecting
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50 overflow-hidden">
      {/* Animated background elements */}
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse"
        style={{ animation: "float 20s ease-in-out infinite" }}
      ></div>
      <div
        className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl animate-pulse"
        style={{ animation: "float 25s ease-in-out infinite reverse" }}
      ></div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-20px) translateX(20px); }
          50% { transform: translateY(-40px) translateX(0px); }
          75% { transform: translateY(-20px) translateX(-20px); }
        }
      `}</style>

      <div className="w-full max-w-md z-10">
        {/* Card */}
        <div className="bg-slate-800/60 border border-cyan-500/20 rounded-xl p-8 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent mb-2">
              MedBalance AI
            </h1>
            <p className="text-slate-400">Sign in to your account</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                disabled={loading}
                className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/20 rounded-lg text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 disabled:opacity-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold py-3 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/25"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <div className="mt-6 text-center text-slate-400 text-sm">
          <p>For authorized government hospital use only</p>
        </div>
      </div>
    </div>
  );
}
