import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, CalendarDays, ScanLine, Activity, CheckCircle, ArrowUpRight, ClipboardList } from "lucide-react";
import { collection, onSnapshot, query, where, collectionGroup } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NurseDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    pendingScans: 0,
    vitalsRecorded: 0
  });

  useEffect(() => {
    // 1. Total Patients
    const qPatients = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubPatients = onSnapshot(qPatients, (snap) => setStats(s => ({ ...s, totalPatients: snap.size })));

    // 2. Today's Appointments (Global)
    const qAppointments = collectionGroup(db, "appointments");
    const unsubAppointments = onSnapshot(qAppointments, (snap) => {
      const today = new Date().toISOString().split('T')[0];
      const todayAppts = snap.docs.filter(doc => doc.data().date === today).length;
      setStats(s => ({ ...s, todayAppointments: todayAppts }));
    });

    return () => {
      unsubPatients();
      unsubAppointments();
    };
  }, []);

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">لوحة تحكم التمريض</h1>
        <p className="text-muted-foreground text-sm mt-1">نظرة عامة على مهام التمريض وإدارة المرضى بالعيادة</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">إجمالي المرضى</p>
              <p className="text-3xl font-bold font-heading text-primary">{stats.totalPatients}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">مواعيد اليوم</p>
              <p className="text-3xl font-bold font-heading text-success">{stats.todayAppointments}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">فحوصات معلقة</p>
              <p className="text-3xl font-bold font-heading text-warning">{stats.pendingScans}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
              <ScanLine className="w-6 h-6 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">حيويات مسجلة</p>
              <p className="text-3xl font-bold font-heading text-secondary">{stats.vitalsRecorded}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="glass-card border-transparent shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" /> مهام التمريض السريعة
            </CardTitle>
            <CardDescription>الوصول السريع للوظائف المتكررة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start h-14" onClick={() => navigate('/nurse/patients')}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ml-3 shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="text-right flex-1">
                <p className="font-bold">دليل المرضى</p>
                <p className="text-xs text-muted-foreground">البحث وعرض ملفات المرضى</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Button>
            
            <Button variant="outline" className="w-full justify-start h-14" onClick={() => navigate('/nurse/vitals')}>
              <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center ml-3 shrink-0">
                <Activity className="w-4 h-4 text-destructive" />
              </div>
              <div className="text-right flex-1">
                <p className="font-bold">مراقبة المؤشرات الحيوية</p>
                <p className="text-xs text-muted-foreground">تسجيل العلامات الحيوية للزيارات</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Button>

            <Button variant="outline" className="w-full justify-start h-14" onClick={() => navigate('/nurse/ocr')}>
              <div className="w-8 h-8 rounded-full bg-warning/10 flex items-center justify-center ml-3 shrink-0">
                <ScanLine className="w-4 h-4 text-warning" />
              </div>
              <div className="text-right flex-1">
                <p className="font-bold">مسح السونار (OCR)</p>
                <p className="text-xs text-muted-foreground">إدخال بيانات السونار آلياً</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card border-transparent shadow-sm bg-white dark:bg-card flex flex-col justify-center items-center py-12">
           <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mb-4">
             <CheckCircle className="w-10 h-10 text-success" />
           </div>
           <h3 className="text-xl font-heading font-bold mb-2">النظام يعمل بكفاءة</h3>
           <p className="text-muted-foreground text-sm text-center px-8">جميع الأقسام الإكلينيكية تعمل بسلاسة، لا توجد مهام طارئة متأخرة. شكراً لجهودك!</p>
        </Card>
      </div>

    </div>
  );
}