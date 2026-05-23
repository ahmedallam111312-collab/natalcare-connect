import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, AlertTriangle, CalendarDays, Activity, ChevronLeft, ArrowUpRight, MessageSquare } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useDoctorData } from "@/hooks/useDoctorData";
import { useNavigate } from "react-router-dom";

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { patients, alerts, appointments, isLoading } = useDoctorData(user?.uid);

  const stats = {
    active: patients.length,
    highRisk: patients.filter(p => p.riskLevel === "high").length,
    todayAppts: appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length
  };

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
      next: future ? future.date : "غير مجدول" 
    };
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Activity className="w-8 h-8 animate-spin text-primary" />
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">الرئيسية</h1>
        <p className="text-muted-foreground mt-2 text-sm">مرحباً د. {user?.displayName}، إليك ملخص سريع لحالة مرضاك اليوم.</p>
      </div>

      {/* KPI Cards (Progressive Disclosure & Calm Design) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">المرضى النشطين</p>
              <p className="text-3xl font-bold font-heading">{stats.active}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">حالات المتابعة الحرجة</p>
              <p className="text-3xl font-bold font-heading text-destructive">{stats.highRisk}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">مواعيد اليوم</p>
              <p className="text-3xl font-bold font-heading text-success">{stats.todayAppts}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* Patient Roster (Actionable Table) */}
        <Card className="glass-card border-transparent shadow-sm flex flex-col h-full bg-white dark:bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-heading flex items-center gap-2">
                سجل المرضى
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5" onClick={() => navigate('/doctor/patients')}>
                عرض الكل <ChevronLeft className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <CardDescription>قائمة بأحدث المريضات اللاتي يحتاجن لمتابعة.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b bg-muted/20 text-muted-foreground">
                    <th className="py-3 px-6 font-medium">اسم المريضة</th>
                    <th className="py-3 px-6 font-medium">أسبوع الحمل</th>
                    <th className="py-3 px-6 font-medium">الموعد القادم</th>
                    <th className="py-3 px-6 font-medium text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {patients.slice(0, 5).map((p) => {
                    const visits = getVisitDates(p.id);
                    return (
                      <tr key={p.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="font-semibold">{p.displayName || "مريضة"}</div>
                          {p.riskLevel === "high" && <Badge variant="destructive" className="mt-1 text-[10px] px-1.5 py-0">عالي الخطورة</Badge>}
                        </td>
                        <td className="py-4 px-6 text-muted-foreground">{p.week ? `الأسبوع ${p.week}` : "-"}</td>
                        <td className="py-4 px-6 font-medium text-primary">{visits.next}</td>
                        <td className="py-4 px-6 text-left">
                          <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => navigate('/doctor/chat')}>
                            <MessageSquare className="w-4 h-4 ml-2" />
                            مراسلة
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {patients.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-muted-foreground">
                        لا يوجد مرضى حالياً.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Priority Alerts (Traffic Light Logic) */}
        <Card className="glass-card border-transparent shadow-sm flex flex-col h-full bg-white dark:bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-heading flex items-center gap-2">
                التنبيهات السريرية
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5" onClick={() => navigate('/doctor/alerts')}>
                سجل التنبيهات <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <CardDescription>الإشعارات التي تتطلب تدخلاً فورياً.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {alerts.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mb-3">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <p className="text-muted-foreground font-medium">كل شيء مستقر</p>
                  <p className="text-xs text-muted-foreground mt-1">لا توجد تنبيهات سريرية عاجلة.</p>
                </div>
              ) : (
                alerts.slice(0, 5).map((a) => (
                  <div key={a.id} className="p-5 flex items-start gap-4 hover:bg-muted/10 transition-colors">
                    {/* Traffic Light Indicator */}
                    <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                      a.severity === 'high' ? 'bg-destructive animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.6)]' : 
                      a.severity === 'moderate' ? 'bg-warning' : 'bg-primary'
                    }`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1.5">
                        <p className="font-bold text-sm text-foreground">{a.patientName}</p>
                        <span className="text-xs text-muted-foreground">{a.time || "حديث"}</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed pr-2 border-r-2 border-muted">
                        {a.message}
                      </p>
                      
                      {/* Actionable Insights */}
                      {a.severity === 'high' && (
                        <div className="mt-3">
                           <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => navigate('/doctor/chat')}>
                             تواصل مع المريضة الآن
                           </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Today's Appointment Timeline */}
      {appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length > 0 && (
        <Card className="glass-card border-transparent shadow-sm bg-white dark:bg-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-heading flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              جدول مواعيد اليوم
            </CardTitle>
            <CardDescription>مواعيد المرضى المقررة لهذا اليوم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {appointments
                .filter(a => a.date === new Date().toISOString().split('T')[0])
                .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                .map((appt, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{appt.time?.slice(0,5) || '--'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{appt.doctor || 'مريضة'}</p>
                      <p className="text-xs text-muted-foreground">{appt.type || 'متابعة'}</p>
                    </div>
                  </div>
                ))
              }
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// helper icon for empty state
import { CheckCircle } from "lucide-react";