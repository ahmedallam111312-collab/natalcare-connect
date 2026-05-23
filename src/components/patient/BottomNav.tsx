import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, Activity, Heart, Baby, Menu, FlaskConical, Pill, MessageCircle, Utensils, BrainCircuit, Users, CalendarHeart, ClipboardList, MessageSquare, Building2, Settings } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

const mobileGroups = [
  {
    id: "health",
    label: "الصحة",
    icon: Activity,
    items: [
      { title: "المؤشرات اليومية", url: "/patient/vitals", icon: Activity },
      { title: "النتائج المخبرية", url: "/patient/labs", icon: FlaskConical },
      { title: "الأدوية", url: "/patient/medications", icon: Pill },
      { title: "متتبع الأعراض", url: "/patient/symptoms", icon: MessageCircle },
    ]
  },
  {
    id: "lifestyle",
    label: "حياتي",
    icon: Heart,
    items: [
      { title: "رحلة الحمل", url: "/patient/journey", icon: CalendarHeart },
      { title: "مخطط التغذية", url: "/patient/nutrition", icon: Utensils },
      { title: "الصحة النفسية", url: "/patient/mental-health", icon: BrainCircuit },
      { title: "مشاركة الشريك", url: "/patient/partner", icon: Users },
    ]
  },
  {
    id: "birth",
    label: "الولادة",
    icon: Baby,
    items: [
      { title: "تجهيزات الولادة", url: "/patient/birth-plan", icon: ClipboardList },
      { title: "متتبع الانقباضات", url: "/patient/contractions", icon: Activity },
    ]
  },
  {
    id: "more",
    label: "المزيد",
    icon: Menu,
    items: [
      { title: "تواصل مع الطبيب", url: "/patient/chat", icon: MessageSquare },
      { title: "المستشفيات المعتمدة", url: "/patient/hospitals", icon: Building2 },
      { title: "الإعدادات", url: "/patient/settings", icon: Settings },
    ]
  }
];

export function BottomNav() {
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const activeGroup = mobileGroups.find(g => openGroup === g.id);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border/50 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-between px-2 h-16">
          
          {/* Home Button - Direct Link */}
          <Link
            to="/patient"
            onClick={() => setOpenGroup(null)}
            className={`flex flex-col items-center justify-center w-1/5 h-full space-y-1 transition-all duration-300 ${
              location.pathname === "/patient" && !openGroup ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className={`p-1.5 rounded-xl transition-colors ${location.pathname === "/patient" && !openGroup ? "bg-primary/10 shadow-sm" : ""}`}>
              <LayoutDashboard className={`w-6 h-6 ${location.pathname === "/patient" && !openGroup ? "fill-primary/20" : ""}`} />
            </div>
            <span className="text-[10px] font-bold">الرئيسية</span>
          </Link>

          {/* Group Buttons */}
          {mobileGroups.map((group) => {
            // Check if any child item is active (for highlight logic)
            const isChildActive = group.items.some(item => location.pathname.startsWith(item.url));
            const isGroupOpen = openGroup === group.id;
            const isHighlighted = isGroupOpen || (isChildActive && !openGroup && location.pathname !== "/patient");

            return (
              <button
                key={group.id}
                onClick={() => setOpenGroup(group.id)}
                className={`flex flex-col items-center justify-center w-1/5 h-full space-y-1 transition-all duration-300 ${
                  isHighlighted ? "text-primary scale-110" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-colors ${isHighlighted ? "bg-primary/10 shadow-sm" : ""}`}>
                  <group.icon className={`w-6 h-6 ${isHighlighted ? "fill-primary/20" : ""}`} />
                </div>
                <span className="text-[10px] font-bold">{group.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drawer for displaying group items */}
      <Drawer open={openGroup !== null} onOpenChange={(open) => !open && setOpenGroup(null)}>
        <DrawerContent className="bg-card/95 backdrop-blur-xl border-t border-border/50 max-h-[80vh]">
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted mt-4 mb-2" />
          <DrawerHeader className="text-right">
            <DrawerTitle className="text-xl font-heading font-bold gradient-text flex items-center gap-2">
              {activeGroup?.icon && <activeGroup.icon className="w-5 h-5 text-primary" />}
              {activeGroup?.label}
            </DrawerTitle>
          </DrawerHeader>
          
          <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar">
            {activeGroup?.items.map((item, idx) => {
              const isActive = location.pathname === item.url;
              return (
                <Link
                  key={idx}
                  to={item.url}
                  onClick={() => setOpenGroup(null)}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-300 ${
                    isActive 
                      ? 'bg-primary/10 border-primary text-primary shadow-sm scale-105' 
                      : 'bg-card border-border/50 text-foreground hover:bg-muted/50 hover:border-primary/50'
                  }`}
                >
                  <div className={`p-3 rounded-full mb-2 ${isActive ? 'bg-primary text-white shadow-md' : 'bg-muted text-muted-foreground'}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-center">{item.title}</span>
                </Link>
              );
            })}
          </div>
          
          {/* Add bottom padding for the mobile nav bar height + safe area */}
          <div className="h-20" />
        </DrawerContent>
      </Drawer>
    </>
  );
}
