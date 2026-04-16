import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Activity, Baby, AlertTriangle, TrendingUp } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts";

export default function DoctorAnalytics() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [patientVitals, setPatientVitals] = useState<any[]>([]);

  // ==========================================
  // 1. جلب بيانات جميع المرضى
  // ==========================================
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // ==========================================
  // 2. جلب المؤشرات الحيوية إذا تم اختيار مريضة محددة
  // ==========================================
  useEffect(() => {
    if (selectedPatient === "all" || !selectedPatient) return;
    
    const vitalsQ = query(
      collection(db, "users", selectedPatient, "vitals"),
      orderBy("createdAt", "asc"),
      limit(10)
    );
    const unsubVitals = onSnapshot(vitalsQ, (snap) => {
      const v = snap.docs.map(d => {
        const data = d.data();
        return {
          date: new Date(data.createdAt?.toDate()).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
          systolic: Number(data.bloodPressureSystolic) || 0,
          diastolic: Number(data.bloodPressureDiastolic) || 0,
          sugar: Number(data.bloodSugar) || 0,
          weight: Number(data.weight) || 0,
        };
      });
      setPatientVitals(v);
    });
    return () => unsubVitals();
  }, [selectedPatient]);

  // ==========================================
  // 3. معالجة البيانات الحقيقية من Firebase للرسوم البيانية
  // ==========================================
  
  // أثلاث الحمل
  const trimesters = {
    first: patients.filter(p => p.week <= 13).length,
    second: patients.filter(p => p.week > 13 && p.week <= 26).length,
    third: patients.filter(p => p.week > 26).length,
  };

  const trimesterData = [
    { name: "الثلث الأول (1-13)", cases: trimesters.first, fill: "hsl(var(--primary))" },
    { name: "الثلث الثاني (14-26)", cases: trimesters.second, fill: "hsl(var(--secondary))" },
    { name: "الثلث الثالث (27-40)", cases: trimesters.third, fill: "hsl(var(--accent))" },
  ];

  // الحالات النشطة وغير النشطة (النشط: التزامه أكثر من 40% أو أكمل ملفه)
  const activeCount = patients.filter(p => p.adherence >= 40 || p.profileCompleted).length;
  const inactiveCount = patients.length - activeCount;

  const activityData = [
    { name: "نشط (Active)", value: activeCount, color: "hsl(142, 76%, 36%)" }, // أخضر
    { name: "غير نشط (Inactive)", value: inactiveCount, color: "hsl(0, 84%, 60%)" }, // أحمر
  ];

  // ==========================================
  // استخراج نمو الحالات التراكمي الحقيقي شهرياً (بدون Mock Data)
  // ==========================================
  const monthlyCasesData = useMemo(() => {
    const arabicMonths = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    
    // ترتيب المرضى من الأقدم للأحدث بناءً على تاريخ التسجيل
    const sortedPatients = [...patients].sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return dateA - dateB;
    });

    const grouped: Record<string, number> = {};
    let totalCumulative = 0;

    sortedPatients.forEach(p => {
      // إذا لم يكن هناك تاريخ مسجل، نعتبره سُجل اليوم
      const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      const monthKey = `${arabicMonths[d.getMonth()]} ${d.getFullYear()}`; // مثال: مارس 2026
      
      totalCumulative += 1;
      grouped[monthKey] = totalCumulative; // تحديث إجمالي ذلك الشهر
    });

    // تحويل الكائن إلى مصفوفة تناسب الرسم البياني
    const data = Object.keys(grouped).map(key => ({
      month: key.split(" ")[0], // استخراج اسم الشهر فقط
      cases: grouped[key]
    }));

    // إذا لم يكن هناك مرضى، نعرض الشهر الحالي بقيمة صفر
    if (data.length === 0) {
      return [{ month: arabicMonths[new Date().getMonth()], cases: 0 }];
    }

    // عرض آخر 6 أشهر فقط لكي لا يزدحم الرسم البياني
    return data.slice(-6);
  }, [patients]);

  // بيانات المريضة المحددة
  const activePatientObj = patients.find(p => p.id === selectedPatient);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      
      {/* رأس الصفحة + فلتر اختيار المريضة */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-xl border border-border">
        <div>
          <h1 className="text-2xl font-heading font-bold">التحليلات والتقارير</h1>
          <p className="text-muted-foreground text-sm mt-1">إحصائيات الحمل والنشاط</p>
        </div>
        <div className="w-full sm:w-72">
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="اختر نطاق التحليل" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all" className="font-bold text-primary">نظرة عامة (جميع المرضى)</SelectItem>
              {patients.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.displayName || "مريضة بدون اسم"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* التحليلات العامة (General Dashboard) */}
      {/* ========================================================= */}
      {selectedPatient === "all" ? (
        <div className="space-y-6">
          {/* البطاقات السريعة */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="w-5 h-5 text-primary" /></div>
                <div><p className="text-xs text-muted-foreground">إجمالي المرضى</p><p className="text-xl font-bold">{patients.length}</p></div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center"><Activity className="w-5 h-5 text-success" /></div>
                <div><p className="text-xs text-muted-foreground">مرضى نشطين</p><p className="text-xl font-bold">{activeCount}</p></div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-destructive" /></div>
                <div><p className="text-xs text-muted-foreground">مرضى غير نشطين</p><p className="text-xl font-bold">{inactiveCount}</p></div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center"><Baby className="w-5 h-5 text-secondary" /></div>
                <div><p className="text-xs text-muted-foreground">الثلث الثالث (اقتراب ولادة)</p><p className="text-xl font-bold">{trimesters.third}</p></div>
              </CardContent>
            </Card>
          </div>

          {/* الرسوم البيانية */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. أثلاث الحمل (Trimesters) */}
            <Card className="glass-card">
              <CardHeader><CardTitle className="font-heading text-lg">المرضى حسب أثلاث الحمل</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={trimesterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="cases" name="عدد الحالات" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 2. نشط / غير نشط (Active vs Inactive) */}
            <Card className="glass-card">
              <CardHeader><CardTitle className="font-heading text-lg">التفاعل والنشاط (Active/Inactive)</CardTitle></CardHeader>
              <CardContent className="flex justify-center items-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={activityData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {activityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 3. تقرير عدد الحالات الحقيقي (نمو العيادة) */}
            <Card className="glass-card lg:col-span-2">
              <CardHeader><CardTitle className="font-heading text-lg">النمو التراكمي لتسجيل الحالات الجديدة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyCasesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="cases" name="إجمالي الحالات المسجلة" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorCases)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* التحليلات الفردية (Individual Patient Dashboard) */
        /* ========================================================= */
        <div className="space-y-6 animate-fade-in">
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">أسبوع الحمل</p><p className="text-xl font-bold text-primary mt-1">{activePatientObj?.week || "-"}</p></CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">نسبة الالتزام</p><p className="text-xl font-bold text-success mt-1">{activePatientObj?.adherence || 0}%</p></CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">مستوى الخطر</p><p className="text-xl font-bold text-destructive mt-1">{activePatientObj?.riskLevel === "high" ? "عالي" : activePatientObj?.riskLevel === "moderate" ? "متوسط" : "منخفض"}</p></CardContent></Card>
            <Card className="glass-card"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">العمر</p><p className="text-xl font-bold mt-1">{activePatientObj?.medicalHistory?.age || "-"}</p></CardContent></Card>
          </div>

          <Card className="glass-card">
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> تطور المؤشرات الحيوية</CardTitle></CardHeader>
            <CardContent>
              {patientVitals.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground text-sm">لا توجد قراءات حيوية سابقة لهذه المريضة.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={patientVitals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', textAlign: 'right' }} />
                    <Legend verticalAlign="top" height={36} />
                    <Line type="monotone" dataKey="systolic" name="ضغط انقباضي" stroke="hsl(var(--destructive))" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolic" name="ضغط انبساطي" stroke="hsl(var(--warning))" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="sugar" name="سكر الدم" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}