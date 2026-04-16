import { LayoutDashboard, Building2, UserCog, Beaker, Settings, ShieldCheck, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/services/firebase";
import { toast } from "sonner";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

const navItems = [
  { title: "لوحة التحكم", url: "/admin", icon: LayoutDashboard },
  { title: "إدارة المستشفيات", url: "/admin/hospitals", icon: Building2 },
  { title: "إدارة المستخدمين", url: "/admin/doctors", icon: UserCog },
  { title: "فئات التحاليل", url: "/admin/lab-categories", icon: Beaker },
  { title: "الإعدادات", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
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
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent-foreground" />
          </div>
          {!collapsed && <span className="font-heading font-bold text-lg">بوابة الإدارة</span>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>الإدارة والنظام</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                    <NavLink to={item.url} end={item.url === "/admin"}>
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