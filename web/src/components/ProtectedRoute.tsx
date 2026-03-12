import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, UserRole } from "../context/AuthContext";
import LoginPage from "../pages/auth/LoginPage";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { isAuthenticated, loading, role } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-cyan-400 font-semibold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Check if user has required role
  if (requiredRole && role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
        <div className="w-full max-w-md">
          <div className="bg-slate-800/60 border border-red-500/20 rounded-xl p-8 backdrop-blur-xl text-center">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-2xl font-bold text-red-400 mb-2">
              Access Denied
            </h2>
            <p className="text-slate-300 mb-6">
              You don't have permission to access this dashboard. Your role is{" "}
              <span className="font-semibold capitalize">
                {role?.replace("_", " ") || "unknown"}
              </span>
              .
            </p>
            <div className="space-y-2">
              {role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-semibold py-2 px-4 rounded-lg transition-all"
                >
                  Go to Admin Dashboard
                </button>
              )}
              {role === "district_manager" && (
                <button
                  onClick={() => navigate("/district-manager")}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 text-slate-900 font-semibold py-2 px-4 rounded-lg transition-all"
                >
                  Go to District Manager Dashboard
                </button>
              )}
              <button
                onClick={() => navigate("/login")}
                className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 font-semibold py-2 px-4 rounded-lg transition-all"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
