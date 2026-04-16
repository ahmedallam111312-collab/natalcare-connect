import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  // Show a loading state while Firebase checks the user session
  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">Loading...</div>;
  }

  // If no user is logged in, kick them to the login page
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If the user's role isn't allowed for this route, send them to their dashboard
  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    const dashboardMap: Record<string, string> = {
      patient: "/patient",
      doctor: "/doctor",
      nurse: "/nurse",
      admin: "/admin",
    };
    return <Navigate to={dashboardMap[user.role] || "/login"} replace />;
  }

  return <>{children}</>;
};