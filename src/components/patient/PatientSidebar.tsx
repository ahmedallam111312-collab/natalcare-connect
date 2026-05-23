import { LayoutDashboard, MessageCircle, FlaskConical, Activity, Pill, Building2, Settings, Baby, LogOut, MessageSquare, ClipboardList, CalendarHeart, Utensils, BrainCircuit, Users } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
      { title: "المستشفيات المعتمدة", url: "/patient/hospitals", icon: Building2 },
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
    <Sidebar side="right" variant="sidebar" collapsible="icon">
      <SidebarContent className="bg-card">
        <div className="flex items-center gap-3 p-4 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Baby className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden overflow-hidden">
            <span className="font-heading font-bold text-lg truncate">عيادة الحمل</span>
            <span className="text-xs text-muted-foreground truncate">د. محمد شعبان</span>
          </div>
        </div>

        <div className="py-2">
          {navGroups.map((group, groupIdx) => (
            <SidebarGroup key={groupIdx} className="pt-2">
              <SidebarGroupLabel className="px-4 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton 
                          asChild 
                          isActive={isActive} 
                          tooltip={item.title}
                          className="w-full justify-start"
                        >
                          <NavLink
                            to={item.url}
                            icon={item.icon}
                            isActive={isActive}
                            onClick={() => setOpenMobile(false)}
                          >
                            {item.title}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </div>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/50 p-4 bg-card mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:text-destructive hover:bg-destructive/10 justify-start w-full" tooltip="تسجيل الخروج">
              <LogOut className="w-5 h-5 ml-3" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}