import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, CalendarDays, Clock, Activity, ChevronLeft } from "lucide-react";
import { collection, query, onSnapshot, where, collectionGroup, orderBy } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState({ active: 0, highRisk: 0 });

  useEffect(() => {
    if (!user) return;

    // 1. جلب جميع المرضى
    const qPatients = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubPatients = onSnapshot(qPatients, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPatients(data);
      setStats({
        active: data.length,
        highRisk: data.filter(p => p.riskLevel === "high").length
      });
    });

    // 2. جلب جميع التنبيهات والتقارير (مرتبة حسب الأهمية: عالي ثم متوسط)
    const qAlerts = query(collection(db, "alerts"), orderBy("severity", "desc"));
    const unsubAlerts = onSnapshot(qAlerts, (snap) => {
      setAlerts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. جلب كافة المواعيد لتحديد الزيارة السابقة والقادمة
    const qAppts = collectionGroup(db, "appointments");
    const unsubAppts = onSnapshot(qAppts, (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, userId: doc.ref.parent.parent?.id, ...doc.data() })));
    });

    return () => { unsubPatients(); unsubAlerts(); unsubAppts(); };
  }, [user]);

  // دالة لاستخراج تاريخ الزيارة السابقة والقادمة لكل مريض
  const getVisitDates = (patientId: string) => {
    const patientAppts = appointments.filter(a => a.userId === patientId);
    const now = new Date();
    
    const past = patientAppts
      .filter(a => new Date(a.date) < now)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
    const future = patientAppts
      .filter(a => new Date(a.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    return { 
      last: past ? past.date : "---", 
      next: future ? future.date : "لم يحدد" 
    };
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة شاملة على حالة المرضى والتنبيهات العاجلة</p>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="glass-card border-primary/20 bg-primary/5">
          <CardContent className="pt-5 flex items-center gap-4">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي المريضات</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-destructive/20 bg-destructive/5">
          <CardContent className="pt-5 flex items-center gap-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">حالات عالية الخطورة</p>
              <p className="text-2xl font-bold">{stats.highRisk}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-success/20 bg-success/5">
          <CardContent className="pt-5 flex items-center gap-4">
            <CalendarDays className="w-8 h-8 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">مواعيد اليوم</p>
              <p className="text-2xl font-bold">{appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* القائمة 1: حالة المريضات (الأسبوع، الزيارة السابقة، القادمة) */}
        <Card className="glass-card flex flex-col min-h-[400px]">
          <CardHeader className="border-b pb-3 bg-muted/30">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> حالة المريضات والمواعيد
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto">
            <div className="divide-y">
              {patients.map((p) => {
                const visits = getVisitDates(p.id);
                return (
                  <div key={p.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">{p.displayName || "مريضة"}</p>
                      <Badge variant="secondary" className="text-[10px]">الأسبوع {p.week || "-"}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="px-3">
                        <p className="text-[10px] text-muted-foreground mb-1">آخر زيارة</p>
                        <p className="text-xs font-medium">{visits.last}</p>
                      </div>
                      <div className="px-3 border-r">
                        <p className="text-[10px] text-primary mb-1">الزيارة القادمة</p>
                        <p className="text-xs font-bold text-primary">{visits.next}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* القائمة 2: التنبيهات والتقارير (بترتيب الأهمية) */}
        <Card className="glass-card flex flex-col min-h-[400px]">
          <CardHeader className="border-b pb-3 bg-destructive/5">
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" /> تنبيهات هامة (مرتبة بالأولوية)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto">
            <div className="divide-y">
              {alerts.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">لا توجد تنبيهات حالياً.</p>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className={`p-4 flex items-start gap-3 ${a.severity === 'high' ? 'bg-destructive/5' : ''}`}>
                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${a.severity === 'high' ? 'bg-destructive animate-pulse' : 'bg-warning'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm truncate">{a.patientName}</p>
                        <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {a.severity === 'high' ? 'عاجل جداً' : 'متوسط'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{a.message}</p>
                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {a.time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}