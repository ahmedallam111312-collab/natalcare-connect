import { Outlet, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PatientSidebar } from "@/components/patient/PatientSidebar";
import { BottomNav } from "@/components/patient/BottomNav";
import { useAuthStore } from "@/stores/authStore";
import NotificationBell from "@/components/NotificationBell";
import UserNav from "@/components/UserNav";

export default function PatientLayout() {
  const { user } = useAuthStore();
  const location = useLocation();

  if (user?.role === "patient" && !user.profileCompleted && location.pathname !== "/patient/onboarding") {
    return <Navigate to="/patient/onboarding" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <PatientSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:flex hidden" />
              <span className="text-sm font-bold gradient-text block md:hidden">عيادة الحمل</span>
              <span className="text-sm text-muted-foreground hidden sm:block">
                مرحباً بعودتك، {user?.displayName?.split(" ")[0] || "مريض"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserNav />
            </div>
          </header>
          
          <main className="flex-1 p-4 md:p-6 overflow-auto pb-24 md:pb-6">
            <Outlet />
          </main>
          
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
}