import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Baby, AlertTriangle, TrendingUp, Heart, Droplets, Scale, Calendar } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  displayName?: string;
  role: string;
  week?: number;
  adherence?: number;
  riskLevel?: "high" | "moderate" | "low";
  profileCompleted?: boolean;
  createdAt?: { toDate: () => Date };
  medicalHistory?: { age?: number };
}

interface VitalEntry {
  date: string;
  systolic: number;
  diastolic: number;
  sugar: number;
  weight: number;
  createdAt?: { toDate: () => Date };
}

type DateRange = "7d" | "30d" | "90d" | "all";

// ─── Helper: format date for Arabic locale ──────────────────────────────────

const arabicMonths = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];

function toArabicDate(date: Date) {
  return `${arabicMonths[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-border bg-background/95 backdrop-blur-sm p-3 shadow-xl text-right"
      style={{ direction: "rtl" }}
    >
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  delay?: number;
  badge?: { label: string; variant: "default" | "destructive" | "secondary" | "outline" };
}

function StatCard({ icon, label, value, iconBg, delay = 0, badge }: StatCardProps) {
  return (
    <Card
      className="glass-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="pt-5 pb-4 flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-2xl font-bold leading-tight">{value}</p>
            {badge && <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <TrendingUp className="w-7 h-7 opacity-40" />
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Risk color map ──────────────────────────────────────────────────────────

const riskColor: Record<string, string> = {
  high: "hsl(0,84%,60%)",
  moderate: "hsl(38,92%,50%)",
  low: "hsl(142,76%,36%)",
};

const riskLabel: Record<string, string> = {
  high: "عالي",
  moderate: "متوسط",
  low: "منخفض",
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DoctorAnalytics() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("all");
  const [patientVitals, setPatientVitals] = useState<VitalEntry[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [loading, setLoading] = useState(true);

  // ── 1. Fetch all patients ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Patient)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, [user]);

  // ── 2. Fetch vitals for selected patient ──────────────────────────────────
  useEffect(() => {
    if (selectedPatient === "all" || !selectedPatient) {
      setPatientVitals([]);
      return;
    }
    const vitalsQ = query(
      collection(db, "users", selectedPatient, "vitals"),
      orderBy("createdAt", "asc"),
      limit(20),
    );
    const unsubVitals = onSnapshot(vitalsQ, (snap) => {
      const v: VitalEntry[] = snap.docs.map((d) => {
        const data = d.data();
        const rawDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
          date: rawDate.toLocaleDateString("ar-EG", { month: "short", day: "numeric" }),
          systolic: Number(data.bloodPressureSystolic) || 0,
          diastolic: Number(data.bloodPressureDiastolic) || 0,
          sugar: Number(data.bloodSugar) || 0,
          weight: Number(data.weight) || 0,
          createdAt: data.createdAt,
        };
      });
      setPatientVitals(v);
    });
    return () => unsubVitals();
  }, [selectedPatient]);

  // ── 3. Date-range filter helper ───────────────────────────────────────────
  const filteredPatients = useMemo(() => {
    if (dateRange === "all") return patients;
    const cutoff = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    cutoff.setDate(cutoff.getDate() - days);
    return patients.filter((p) => {
      const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      return d >= cutoff;
    });
  }, [patients, dateRange]);

  // ── 4. Derived stats ──────────────────────────────────────────────────────
  const trimesters = useMemo(() => ({
    first: filteredPatients.filter((p) => (p.week ?? 0) <= 13).length,
    second: filteredPatients.filter((p) => (p.week ?? 0) > 13 && (p.week ?? 0) <= 26).length,
    third: filteredPatients.filter((p) => (p.week ?? 0) > 26).length,
  }), [filteredPatients]);

  const trimesterData = [
    { name: "الثلث الأول", subtitle: "1-13", cases: trimesters.first, fill: "hsl(var(--primary))" },
    { name: "الثلث الثاني", subtitle: "14-26", cases: trimesters.second, fill: "hsl(var(--secondary))" },
    { name: "الثلث الثالث", subtitle: "27-40", cases: trimesters.third, fill: "hsl(var(--accent))" },
  ];

  const activeCount = useMemo(
    () => filteredPatients.filter((p) => (p.adherence ?? 0) >= 40 || p.profileCompleted).length,
    [filteredPatients],
  );
  const inactiveCount = filteredPatients.length - activeCount;

  const activityData = [
    { name: "نشطة", value: activeCount, color: "hsl(142, 76%, 36%)" },
    { name: "غير نشطة", value: inactiveCount, color: "hsl(0, 84%, 60%)" },
  ];

  // Risk distribution
  const riskData = useMemo(() => {
    const counts = { high: 0, moderate: 0, low: 0 };
    filteredPatients.forEach((p) => {
      const r = (p.riskLevel ?? "low") as keyof typeof counts;
      if (r in counts) counts[r]++;
    });
    return [
      { name: "خطر عالي", value: counts.high, color: riskColor.high },
      { name: "خطر متوسط", value: counts.moderate, color: riskColor.moderate },
      { name: "خطر منخفض", value: counts.low, color: riskColor.low },
    ];
  }, [filteredPatients]);

  // ── 5. Monthly cumulative growth ─────────────────────────────────────────
  const monthlyCasesData = useMemo(() => {
    const sorted = [...patients].sort((a, b) => {
      const da = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
      const db_ = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
      return da - db_;
    });

    const grouped: Record<string, { month: string; cases: number; new: number }> = {};
    let cumulative = 0;

    sorted.forEach((p) => {
      const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      const key = toArabicDate(d);
      cumulative++;
      if (!grouped[key]) {
        grouped[key] = { month: arabicMonths[d.getMonth()], cases: 0, new: 0 };
      }
      grouped[key].cases = cumulative;
      grouped[key].new++;
    });

    const data = Object.values(grouped);
    if (data.length === 0) {
      return [{ month: arabicMonths[new Date().getMonth()], cases: 0, new: 0 }];
    }
    return data.slice(-6);
  }, [patients]);

  // ── 6. Vitals filtered by date range ──────────────────────────────────────
  const filteredVitals = useMemo(() => {
    if (dateRange === "all") return patientVitals;
    const cutoff = new Date();
    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    cutoff.setDate(cutoff.getDate() - days);
    return patientVitals.filter((v) => {
      const d = v.createdAt?.toDate ? v.createdAt.toDate() : new Date();
      return d >= cutoff;
    });
  }, [patientVitals, dateRange]);

  const activePatientObj = patients.find((p) => p.id === selectedPatient);

  // ── Latest vitals snapshot ─────────────────────────────────────────────────
  const latestVital = patientVitals[patientVitals.length - 1];

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-2xl border border-border">
        <div>
          <h1 className="text-2xl font-heading font-bold tracking-tight">التحليلات والتقارير</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {loading ? "جارٍ التحميل…" : `${patients.length} مريضة مسجلة`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Date range filter */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="bg-background w-full sm:w-36">
              <Calendar className="w-4 h-4 ml-1 opacity-60" />
              <SelectValue placeholder="الفترة الزمنية" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="7d">آخر 7 أيام</SelectItem>
              <SelectItem value="30d">آخر 30 يومًا</SelectItem>
              <SelectItem value="90d">آخر 90 يومًا</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>

          {/* Patient selector */}
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger className="bg-background w-full sm:w-64">
              <SelectValue placeholder="اختر نطاق التحليل" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="all" className="font-bold text-primary">
                نظرة عامة (جميع المرضى)
              </SelectItem>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    {p.displayName || "مريضة بدون اسم"}
                    {p.riskLevel === "high" && (
                      <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          GENERAL DASHBOARD
      ════════════════════════════════════════════════════════════ */}
      {selectedPatient === "all" ? (
        <div className="space-y-6">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="w-5 h-5 text-primary" />}
              iconBg="bg-primary/10"
              label="إجمالي المرضى"
              value={filteredPatients.length}
              delay={0}
            />
            <StatCard
              icon={<Activity className="w-5 h-5 text-success" />}
              iconBg="bg-success/10"
              label="مرضى نشطات"
              value={activeCount}
              delay={60}
              badge={
                filteredPatients.length > 0
                  ? { label: `${Math.round((activeCount / filteredPatients.length) * 100)}%`, variant: "secondary" }
                  : undefined
              }
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5 text-destructive" />}
              iconBg="bg-destructive/10"
              label="غير نشطات"
              value={inactiveCount}
              delay={120}
            />
            <StatCard
              icon={<Baby className="w-5 h-5 text-secondary" />}
              iconBg="bg-secondary/10"
              label="اقتراب الولادة (ث3)"
              value={trimesters.third}
              delay={180}
            />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Trimesters Bar Chart */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-base">توزيع مراحل الحمل</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPatients.length === 0 ? (
                  <EmptyState message="لا توجد بيانات في هذه الفترة" />
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trimesterData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Bar dataKey="cases" name="عدد الحالات" radius={[6, 6, 0, 0]}>
                        {trimesterData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Activity Donut */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-base">معدل التفاعل والنشاط</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {filteredPatients.length === 0 ? (
                  <EmptyState message="لا توجد بيانات في هذه الفترة" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={activityData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {activityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-1">
                      {activityData.map((entry) => (
                        <div key={entry.name} className="flex items-center gap-1.5 text-sm">
                          <span className="w-3 h-3 rounded-full" style={{ background: entry.color }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                          <span className="font-bold">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Risk Distribution Donut */}
            <Card className="glass-card">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-base">توزيع مستوى الخطر</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {filteredPatients.length === 0 ? (
                  <EmptyState message="لا بيانات" />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={riskData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {riskData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-1.5 w-full mt-1">
                      {riskData.map((entry) => (
                        <div key={entry.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                            <span className="text-muted-foreground">{entry.name}</span>
                          </div>
                          <span className="font-bold">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Cumulative Growth Area Chart */}
            <Card className="glass-card lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-heading text-base">النمو التراكمي للحالات المسجلة</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyCasesData.every((d) => d.cases === 0) ? (
                  <EmptyState message="لا يوجد تاريخ تسجيل محفوظ للمرضى الحاليين" />
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <AreaChart data={monthlyCasesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" height={28} iconSize={8} wrapperStyle={{ fontSize: "12px", paddingBottom: "4px" }} />
                      <Area
                        type="monotone"
                        dataKey="cases"
                        name="إجمالي تراكمي"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#colorCases)"
                        dot={{ r: 3 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="new"
                        name="حالات جديدة"
                        stroke="hsl(var(--secondary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorNew)"
                        dot={{ r: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

      ) : (
        /* ════════════════════════════════════════════════════════════
            INDIVIDUAL PATIENT DASHBOARD
        ════════════════════════════════════════════════════════════ */
        <div className="space-y-6 animate-fade-in">

          {/* Patient Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Baby className="w-5 h-5 text-primary" />}
              iconBg="bg-primary/10"
              label="أسبوع الحمل"
              value={activePatientObj?.week ?? "—"}
              delay={0}
              badge={
                activePatientObj?.week
                  ? {
                      label: activePatientObj.week <= 13 ? "ث1" : activePatientObj.week <= 26 ? "ث2" : "ث3",
                      variant: "outline",
                    }
                  : undefined
              }
            />
            <StatCard
              icon={<Activity className="w-5 h-5 text-success" />}
              iconBg="bg-success/10"
              label="نسبة الالتزام"
              value={`${activePatientObj?.adherence ?? 0}%`}
              delay={60}
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5 text-destructive" />}
              iconBg="bg-destructive/10"
              label="مستوى الخطر"
              value={riskLabel[activePatientObj?.riskLevel ?? "low"]}
              delay={120}
            />
            <StatCard
              icon={<Users className="w-5 h-5 text-muted-foreground" />}
              iconBg="bg-muted"
              label="العمر"
              value={activePatientObj?.medicalHistory?.age ?? "—"}
              delay={180}
            />
          </div>

          {/* Latest Vitals Snapshot */}
          {latestVital && (
            <div className="grid grid-cols-3 gap-4">
              <Card className="glass-card text-center">
                <CardContent className="p-4">
                  <Heart className="w-5 h-5 mx-auto mb-1 text-destructive" />
                  <p className="text-xs text-muted-foreground">آخر ضغط دم</p>
                  <p className="text-lg font-bold mt-1">{latestVital.systolic}/{latestVital.diastolic}</p>
                  <p className="text-xs text-muted-foreground">mmHg</p>
                </CardContent>
              </Card>
              <Card className="glass-card text-center">
                <CardContent className="p-4">
                  <Droplets className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">آخر سكر دم</p>
                  <p className="text-lg font-bold mt-1">{latestVital.sugar}</p>
                  <p className="text-xs text-muted-foreground">mg/dL</p>
                </CardContent>
              </Card>
              <Card className="glass-card text-center">
                <CardContent className="p-4">
                  <Scale className="w-5 h-5 mx-auto mb-1 text-secondary" />
                  <p className="text-xs text-muted-foreground">آخر وزن</p>
                  <p className="text-lg font-bold mt-1">{latestVital.weight}</p>
                  <p className="text-xs text-muted-foreground">kg</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Blood Pressure + Sugar Line Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Heart className="w-5 h-5 text-destructive" />
                تطور ضغط الدم وسكر الدم
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredVitals.length === 0 ? (
                <EmptyState message="لا توجد قراءات حيوية في الفترة المحددة" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={filteredVitals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="top" height={36} iconSize={8} wrapperStyle={{ fontSize: "12px" }} />
                    <Line type="monotone" dataKey="systolic" name="ضغط انقباضي" stroke="hsl(var(--destructive))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="diastolic" name="ضغط انبساطي" stroke="hsl(38,92%,50%)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="sugar" name="سكر الدم" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Weight Trend Area Chart */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Scale className="w-5 h-5 text-secondary" />
                منحنى الوزن خلال الحمل
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredVitals.length === 0 ? (
                <EmptyState message="لا توجد قراءات وزن في الفترة المحددة" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={filteredVitals} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--secondary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--secondary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="weight"
                      name="الوزن (kg)"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorWeight)"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}