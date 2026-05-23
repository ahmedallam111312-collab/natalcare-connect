import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, CalendarDays, ScanLine, Activity, ArrowUpRight, Calendar, Clock, CheckCircle } from "lucide-react";
import { collection, onSnapshot, query, where, collectionGroup } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalPatients: 0, todayAppointments: 0, pendingScans: 0, vitalsRecorded: 0 });
  const [todayQueue, setTodayQueue] = useState<any[]>([]);

  useEffect(() => {
    const qPatients = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubPatients = onSnapshot(qPatients, (snap) => setStats(s => ({ ...s, totalPatients: snap.size })));

    const qAppointments = collectionGroup(db, "appointments");
    const unsubAppointments = onSnapshot(qAppointments, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      const todayDocs = snap.docs.filter(doc => doc.data().date === today);
      setStats(s => ({ ...s, todayAppointments: todayDocs.length }));
      const queue = todayDocs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => (a.time || '').localeCompare(b.time || ''));
      setTodayQueue(queue);
    });

    return () => { unsubPatients(); unsubAppointments(); };
  }, []);

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">لوحة تحكم التمريض</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على مهام التمريض وإدارة المرضى بالعيادة</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "إجمالي المرضى", value: stats.totalPatients, color: "primary", icon: Users },
          { label: "مواعيد اليوم", value: stats.todayAppointments, color: "success", icon: CalendarDays },
          { label: "فحوصات معلقة", value: stats.pendingScans, color: "warning", icon: ScanLine },
          { label: "حيويات مسجلة", value: stats.vitalsRecorded, color: "secondary", icon: Activity },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card hover:shadow-lg transition-all border-transparent bg-white dark:bg-card group cursor-default">
            <CardContent className="p-6 flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                <p className={`text-3xl font-bold font-heading text-${stat.color}`}>{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <Card className="glass-card border-transparent shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> المهام السريعة
            </CardTitle>
            <CardDescription>الوصول السريع للوظائف المتكررة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "دليل المرضى", desc: "البحث وعرض ملفات المرضى", route: '/nurse/patients', icon: Users, color: 'primary' },
              { label: "الجدول والمواعيد", desc: "إدارة مواعيد العيادة", route: '/nurse/scheduling', icon: Calendar, color: 'success' },
              { label: "مسح السونار (OCR)", desc: "إدخال بيانات السونار آلياً", route: '/nurse/ultrasound', icon: ScanLine, color: 'warning' },
            ].map((action) => (
              <Button
                key={action.route}
                variant="outline"
                className="w-full justify-start h-14 hover:border-primary/40 hover:bg-primary/5 transition-all"
                onClick={() => navigate(action.route)}
              >
                <div className={`w-9 h-9 rounded-xl bg-${action.color}/10 flex items-center justify-center ml-3 shrink-0`}>
                  <action.icon className={`w-4 h-4 text-${action.color}`} />
                </div>
                <div className="text-right flex-1">
                  <p className="font-bold text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Today's Appointment Queue */}
        <Card className="glass-card border-transparent shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-heading flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" /> طابور اليوم
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate('/nurse/scheduling')}>
                الجدول الكامل <ArrowUpRight className="w-3 h-3 mr-1" />
              </Button>
            </div>
            <CardDescription>المرضى المتواجدون في العيادة اليوم</CardDescription>
          </CardHeader>
          <CardContent>
            {todayQueue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-success" />
                </div>
                <p className="font-semibold text-foreground">لا توجد مواعيد اليوم</p>
                <p className="text-xs text-muted-foreground mt-1">الجدول فارغ لهذا اليوم</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {todayQueue.map((appt, i) => (
                  <div key={appt.id || i} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-primary">{appt.time?.slice(0,5) || '--:--'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{appt.doctor || 'مريضة'}</p>
                      <p className="text-xs text-muted-foreground">{appt.type || 'متابعة دورية'}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {i + 1}#
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}