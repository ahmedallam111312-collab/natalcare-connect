import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LogOut, Users } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function PartnerLayout() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user || user.role !== "partner") {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("تم تسجيل الخروج بنجاح");
      navigate("/login");
    } catch (error) {
      toast.error("فشل تسجيل الخروج");
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background/95" dir="rtl">
        {/* Simple Top Navigation since partner doesn't have a full sidebar for MVP */}
        <div className="w-full flex flex-col">
          <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" />
              <span className="font-heading font-bold text-lg">بوابة الشريك</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="w-4 h-4 ml-2" />
              تسجيل الخروج
            </Button>
          </header>
          
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
