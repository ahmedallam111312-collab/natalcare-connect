import { LayoutDashboard, MessageCircle, FlaskConical, Activity, Pill, Building2, Settings, Baby, LogOut, MessageSquare, ClipboardList, CalendarHeart, Utensils, BrainCircuit, Users } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const navGroups = [
  {
    label: "نظرة عامة",
    items: [
      { title: "الرئيسية", url: "/patient", icon: LayoutDashboard },
      { title: "رحلة الحمل", url: "/patient/journey", icon: CalendarHeart },
    ]
  },
  {
    label: "الصحة والمتابعة",
    items: [
      { title: "المؤشرات اليومية", url: "/patient/vitals", icon: Activity },
      { title: "النتائج المخبرية", url: "/patient/labs", icon: FlaskConical },
      { title: "الأدوية", url: "/patient/medications", icon: Pill },
      { title: "متتبع الأعراض", url: "/patient/symptoms", icon: MessageCircle },
    ]
  },
  {
    label: "نمط الحياة والدعم",
    items: [
      { title: "مخطط التغذية", url: "/patient/nutrition", icon: Utensils },
      { title: "الصحة النفسية", url: "/patient/mental-health", icon: BrainCircuit },
      { title: "تواصل مع الطبيب", url: "/patient/chat", icon: MessageSquare },
      { title: "مشاركة الشريك", url: "/patient/partner", icon: Users },
    ]
  },
  {
    label: "الاستعداد للولادة",
    items: [
      { title: "تجهيزات الولادة", url: "/patient/birth-plan", icon: ClipboardList },
      { title: "متتبع الانقباضات", url: "/patient/contractions", icon: Activity },
    ]
  },
  {
    label: "إعدادات النظام",
    items: [
      { title: "المستشفيات", url: "/patient/hospitals", icon: Building2 },
      { title: "الإعدادات", url: "/patient/settings", icon: Settings },
    ]
  }
];

export function PatientSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setOpenMobile } = useSidebar();

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
    <Sidebar side="right" variant="sidebar" collapsible="icon" className="border-l border-border/50 shadow-xl z-20">
      <SidebarContent className="bg-gradient-to-b from-card to-card/95 backdrop-blur-xl">
        <div className="flex items-center gap-4 p-6 border-b border-border/30 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <Baby className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-heading font-bold text-xl truncate gradient-text">عيادة الحمل</span>
            <span className="text-xs text-muted-foreground font-medium truncate mt-0.5">د. محمد شعبان</span>
          </div>
        </div>

        <div className="px-3 pb-6 overflow-y-auto custom-scrollbar">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-6 last:mb-0 animate-in fade-in slide-in-from-right-2" style={{ animationDelay: `${groupIdx * 100}ms` }}>
              <div className="px-4 text-[11px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-3 flex items-center gap-2 group-data-[collapsible=icon]:hidden">
                <span className="w-2 h-2 rounded-full bg-primary/20"></span>
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setOpenMobile(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative
                        ${isActive 
                          ? 'bg-gradient-to-l from-primary/15 to-transparent text-primary font-bold shadow-sm' 
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium'
                        }
                      `}
                    >
                      {isActive && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-l-full" />
                      )}
                      <div className={`
                        p-2 rounded-lg transition-colors
                        ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-transparent group-hover:bg-background'}
                      `}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        {item.title}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-border/30 p-4 bg-card/95 backdrop-blur-xl mt-auto">
        <button 
          onClick={handleLogout} 
          className="flex items-center gap-3 px-3 py-3 w-full rounded-xl text-destructive hover:bg-destructive/10 transition-all font-bold group"
        >
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </div>
          <span className="group-data-[collapsible=icon]:hidden">تسجيل الخروج</span>
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}