import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DoctorSidebar } from "@/components/doctor/DoctorSidebar";
import { useAuthStore } from "@/stores/authStore";
import NotificationBell from "@/components/NotificationBell";
import UserNav from "@/components/UserNav";

export default function DoctorLayout() {
  const { user } = useAuthStore();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full" dir="rtl">
        <DoctorSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground hidden sm:block">
                Dr. {user?.displayName || "Doctor"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <UserNav />
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}