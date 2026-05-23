import { LayoutDashboard, MessageCircle, FlaskConical, Activity, Pill, Building2, Settings, Baby, LogOut, MessageSquare, ClipboardList, CalendarHeart, Utensils, BrainCircuit, Users, Zap } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, useSidebar } from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "نظرة عامة",
    color: "from-primary/20 to-primary/5",
    items: [
      { title: "الرئيسية", url: "/patient", icon: LayoutDashboard },
      { title: "رحلة الحمل", url: "/patient/journey", icon: CalendarHeart },
    ]
  },
  {
    label: "الصحة",
    color: "from-rose-500/20 to-rose-500/5",
    items: [
      { title: "المؤشرات اليومية", url: "/patient/vitals", icon: Activity },
      { title: "التحاليل", url: "/patient/labs", icon: FlaskConical },
      { title: "الأدوية", url: "/patient/medications", icon: Pill },
      { title: "الأعراض", url: "/patient/symptoms", icon: MessageCircle },
    ]
  },
  {
    label: "نمط الحياة",
    color: "from-emerald-500/20 to-emerald-500/5",
    items: [
      { title: "التغذية", url: "/patient/nutrition", icon: Utensils },
      { title: "الصحة النفسية", url: "/patient/mental-health", icon: BrainCircuit },
      { title: "التواصل مع الطبيب", url: "/patient/chat", icon: MessageSquare },
      { title: "مشاركة الشريك", url: "/patient/partner", icon: Users },
    ]
  },
  {
    label: "الولادة",
    color: "from-violet-500/20 to-violet-500/5",
    items: [
      { title: "خطة الولادة", url: "/patient/birth-plan", icon: ClipboardList },
      { title: "متتبع الانقباضات", url: "/patient/contractions", icon: Zap },
    ]
  },
  {
    label: "أخرى",
    color: "from-slate-500/20 to-slate-500/5",
    items: [
      { title: "المستشفيات", url: "/patient/hospitals", icon: Building2 },
      { title: "الإعدادات", url: "/patient/settings", icon: Settings },
    ]
  }
];

export function PatientSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile, state } = useSidebar();
  const collapsed = state === "collapsed";

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
    <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l border-border/40 shadow-2xl z-20">
      <SidebarContent className="bg-gradient-to-b from-card via-card to-card/90 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 p-5 border-b border-border/30">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-lg shadow-primary/25">
            <Baby className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <span className="font-heading font-bold text-base truncate gradient-text block">عيادة الحمل</span>
              <span className="text-[11px] text-muted-foreground truncate block">متابعة حملك باهتمام</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <div className="px-2 py-4 overflow-y-auto flex-1 space-y-1 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-3 py-2 mt-2">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    onClick={() => setOpenMobile(false)}
                    title={collapsed ? item.title : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative mb-0.5
                      ${isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }
                    `}
                  >
                    {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-l-full" />}
                    <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                      isActive ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'group-hover:bg-background'
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

      <SidebarFooter className="border-t border-border/30 p-3 bg-card/90">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-destructive hover:bg-destructive/10 transition-all group"
          title={collapsed ? "تسجيل الخروج" : undefined}
        >
          <div className="p-1.5 rounded-lg bg-destructive/10 group-hover:bg-destructive group-hover:text-white transition-colors shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          {!collapsed && <span className="text-sm font-semibold">تسجيل الخروج</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}