import { LayoutDashboard, CalendarHeart, MessageSquare, Activity, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomNav() {
  const location = useLocation();
  const { setOpenMobile } = useSidebar();

  const navItems = [
    { title: "الرئيسية", url: "/patient", icon: LayoutDashboard },
    { title: "الحمل", url: "/patient/journey", icon: CalendarHeart },
    { title: "الانقباضات", url: "/patient/contractions", icon: Activity },
    { title: "الطبيب", url: "/patient/chat", icon: MessageSquare },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-t border-border pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <Link
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}>
                <item.icon className={`w-5 h-5 ${isActive ? "fill-primary/20" : ""}`} />
              </div>
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
        
        {/* Menu button to open the Sidebar on mobile */}
        <button
          onClick={() => setOpenMobile(true)}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className="p-1.5 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium">المزيد</span>
        </button>
      </div>
    </div>
  );
}
