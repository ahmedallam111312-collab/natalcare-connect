import { LayoutDashboard, Users, Calendar, ScanLine, Settings, Baby, LogOut, HeartPulse } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "الرئيسية",
    items: [
      { title: "لوحة التحكم", url: "/nurse", icon: LayoutDashboard },
      { title: "دليل المرضى", url: "/nurse/patients", icon: Users },
    ]
  },
  {
    label: "المهام الإكلينيكية",
    items: [
      { title: "الجدول والمواعيد", url: "/nurse/scheduling", icon: Calendar },
      { title: "مسح السونار", url: "/nurse/ultrasound", icon: ScanLine },
    ]
  },
  {
    label: "النظام",
    items: [
      { title: "الإعدادات", url: "/nurse/settings", icon: Settings },
    ]
  }
];

export function NurseSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();

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
    <Sidebar side="right" collapsible="icon" className="border-l border-border/40 shadow-2xl" dir="rtl">
      <SidebarContent className="bg-gradient-to-b from-emerald-950 via-emerald-950 to-emerald-900 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-heading font-bold text-base text-white truncate block">بوابة التمريض</span>
              <span className="text-[11px] text-white/50 truncate block">رعاية متكاملة للأمهات</span>
            </div>
          )}
        </div>

        {/* Nav Groups */}
        <div className="px-2 py-4 space-y-1 overflow-y-auto flex-1">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest px-3 py-2 mt-2">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.url || (item.url !== '/nurse' && location.pathname.startsWith(item.url));
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    title={collapsed ? item.title : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative mb-0.5
                      ${isActive
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                      }
                    `}
                  >
                    {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-emerald-400 rounded-l-full" />}
                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isActive ? 'bg-emerald-500 text-white shadow-sm' : 'group-hover:bg-white/10'
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    {!collapsed && <span className="text-sm truncate">{item.title}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/10 p-3 bg-emerald-950">
        <button
          onClick={handleLogout}
          title={collapsed ? "تسجيل الخروج" : undefined}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-red-400 hover:bg-red-500/20 transition-all group"
        >
          <div className="p-1.5 rounded-lg bg-red-500/20 group-hover:bg-red-500 group-hover:text-white transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          {!collapsed && <span className="text-sm font-semibold">تسجيل الخروج</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}