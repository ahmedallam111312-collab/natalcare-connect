import { LayoutDashboard, Users, Bell, BarChart3, MessageSquare, FileText, Settings, Baby, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { title: "لوحة التحكم", url: "/doctor", icon: LayoutDashboard },
  { title: "المرضى", url: "/doctor/patients", icon: Users },
  { title: "التنبيهات العاجلة", url: "/doctor/alerts", icon: Bell },
  { title: "التحليلات", url: "/doctor/analytics", icon: BarChart3 },
  { title: "المحادثات", url: "/doctor/chat", icon: MessageSquare },
  { title: "قوالب الرسائل", url: "/doctor/templates", icon: FileText },
  { title: "الإعدادات", url: "/doctor/settings", icon: Settings },
];

export function DoctorSidebar() {
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
    <Sidebar side="right" collapsible="icon" className="border-l border-border" dir="rtl">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Baby className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-heading font-bold text-lg">عيادة الدكتور محمد شعبان</span>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>القائمة الطبية</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end={item.url === "/doctor"}>
                      <item.icon className="ml-2" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="ml-2" />
              <span>تسجيل الخروج</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}