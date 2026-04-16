import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Baby,
  CalendarDays,
  Activity,
  TrendingUp,
  Plus,
  Minus,
  RotateCcw,
  Play,
  Pause,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────
const FMC_DURATION = 2 * 60 * 60; // 2 hours in seconds
const KICK_GOAL = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatArabicDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type FMCStatus = "idle" | "running" | "paused" | "done";

interface Appointment {
  id?: string;
  date: string;
  time: string;
  doctor: string;
  type: string;
  notes?: string;
}

interface FMCReport {
  date: string;
  kicks: number;
  goalMet: boolean;
  durationSeconds: number;
  status: "normal" | "needs_followup";
}

// ─── Circular Progress Ring ────────────────────────────────────────────────────
function TimerRing({ progress, timeLabel }: { progress: number; timeLabel: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color = progress < 0.1 ? "#e24b4a" : progress < 0.25 ? "#BA7517" : "#d4537e";

  return (
    <div className="relative w-32 h-32 mx-auto mb-4">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3eef2" strokeWidth="7" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.5s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-bold text-gray-800 tabular-nums">{timeLabel}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">المتبقي</span>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PatientDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // ── Profile Check ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    
    const checkProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && !userDoc.data().profileCompleted) {
          navigate("/patient/onboarding");
        }
      } catch (error) {
        console.error("Error checking profile:", error);
      }
    };
    checkProfile();
  }, [user, navigate]);

  // ── Vitals & appointments ──────────────────────────────────
  const [latestVitals, setLatestVitals] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [gestationalWeek] = useState(28);

  useEffect(() => {
    if (!user) return;

    const vitalsQ = query(
      collection(db, "users", user.uid, "vitals"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const unsub1 = onSnapshot(vitalsQ, (snap) => {
      setLatestVitals(snap.empty ? null : snap.docs[0].data());
    });

    const apptQ = query(
      collection(db, "users", user.uid, "appointments"),
      orderBy("date", "asc")
    );
    const unsub2 = onSnapshot(apptQ, (snap) => {
      setAppointments(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Appointment, "id">) }))
      );
    });

    return () => { unsub1(); unsub2(); };
  }, [user]);

  // ── FMC state ─────────────────────────────────────────────────────────────
  const [fmcStatus, setFmcStatus] = useState<FMCStatus>("idle");
  const [remaining, setRemaining] = useState(FMC_DURATION);
  const [kicks, setKicks] = useState(0);
  const [report, setReport] = useState<FMCReport | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishSession = useCallback((finalKicks: number) => {
    clearTimer();
    setFmcStatus("done");
    setRemaining(0);
    const goalMet = finalKicks >= KICK_GOAL;
    setReport({
      date: new Date().toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      kicks: finalKicks,
      goalMet,
      durationSeconds: FMC_DURATION,
      status: goalMet ? "normal" : "needs_followup",
    });
    toast.success(
      goalMet
        ? "انتهت الجلسة! الجنين نشط ✓"
        : "انتهت الجلسة — يُنصح بمراجعة الطبيبة",
      { icon: "👶", duration: 4000 }
    );
  }, [clearTimer]);

  const startFMC = useCallback(() => {
    setFmcStatus("running");
    setReport(null);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setKicks((k) => { finishSession(k); return k; });
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [finishSession]);

  const pauseFMC = useCallback(() => {
    clearTimer();
    setFmcStatus("paused");
  }, [clearTimer]);

  const resumeFMC = useCallback(() => {
    setFmcStatus("running");
    timerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          setKicks((k) => { finishSession(k); return k; });
          return 0;
        }
        return next;
      });
    }, 1000);
  }, [finishSession]);

  const resetFMC = useCallback(() => {
    clearTimer();
    setFmcStatus("idle");
    setRemaining(FMC_DURATION);
    setKicks(0);
    setReport(null);
  }, [clearTimer]);

  const addKick = useCallback(() => {
    if (fmcStatus !== "running") return;
    setKicks((prev) => {
      const n = prev + 1;
      if (n === KICK_GOAL) toast.success("تم الوصول للهدف! ١٠ ركلات ✓", { icon: "🎉" });
      return n;
    });
  }, [fmcStatus]);

  const undoKick = useCallback(() => {
    if (fmcStatus !== "running") return;
    setKicks((prev) => Math.max(0, prev - 1));
  }, [fmcStatus]);

  // =========================================
  // دالة الإرسال المبكر للطبيب (End & Send Now)
  // =========================================
  const sendEarlyReport = async () => {
    if (!user) return;
    
    // إيقاف العداد
    clearTimer();
    setSendingReport(true);
    
    try {
      const elapsedSeconds = FMC_DURATION - remaining;
      const elapsedMinutes = Math.floor(elapsedSeconds / 60);
      const isGoalMet = kicks >= KICK_GOAL;

      const earlyReport = {
        date: new Date().toLocaleDateString("ar-EG", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        kicks: kicks,
        goalMet: isGoalMet,
        durationSeconds: elapsedSeconds,
        status: isGoalMet ? "normal" : "needs_followup",
      };

      // 1. حفظ التقرير في ملف المريضة
      await addDoc(collection(db, "users", user.uid, "fmcReports"), {
        ...earlyReport,
        createdAt: serverTimestamp(),
        gestationalWeek,
      });

      // 2. إرسال تنبيه فوري للطبيب
      await addDoc(collection(db, "alerts"), {
        patientId: user.uid,
        patientName: user.displayName,
        type: "fmc",
        message: `أنهت المريضة جلسة حركة الجنين مبكراً. الركلات: ${kicks} خلال ${elapsedMinutes} دقيقة.`,
        severity: isGoalMet ? "low" : "high", // تصبح عالية الخطورة إذا أنهت الجلسة ولم تصل للهدف
        acknowledged: false,
        createdAt: serverTimestamp(),
      });

      toast.success("تم إرسال التقرير الحالي للطبيبة بنجاح ✓", { duration: 3500 });
      resetFMC(); // إعادة تعيين الجلسة للبداية
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال التقرير، يرجى المحاولة مجدداً");
    } finally {
      setSendingReport(false);
    }
  };

  // دالة الإرسال عند الانتهاء الكامل للساعتين
  const sendFMCReport = useCallback(async () => {
    if (!user || !report) return;
    setSendingReport(true);
    try {
      await addDoc(collection(db, "users", user.uid, "fmcReports"), {
        ...report,
        createdAt: serverTimestamp(),
        gestationalWeek,
      });

      await addDoc(collection(db, "alerts"), {
        patientId: user.uid,
        patientName: user.displayName,
        type: "fmc",
        message: report.goalMet 
          ? `سجلت المريضة حركة جنين طبيعية (${report.kicks} ركلات).` 
          : `⚠️ تنبيه: حركة الجنين أقل من الطبيعي (${report.kicks} ركلات فقط)!`,
        severity: report.goalMet ? "low" : "high",
        acknowledged: false,
        createdAt: serverTimestamp(),
      });

      toast.success("تم إرسال التقرير إلى الطبيبة بنجاح ✓", { duration: 3500 });
      resetFMC();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال التقرير، يرجى المحاولة مجدداً");
    } finally {
      setSendingReport(false);
    }
  }, [user, report, gestationalWeek, resetFMC]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  // ── Appointment booking ────────────────────────────────────────────────────
  const [apptForm, setApptForm] = useState({
    date: "",
    time: "",
    doctor: "",
    type: "",
    notes: "",
  });
  const [bookingLoading, setBookingLoading] = useState(false);

  const handleApptChange = (field: string, value: string) =>
    setApptForm((prev) => ({ ...prev, [field]: value }));

  const bookAppointment = useCallback(async () => {
    const { date, time, doctor, type } = apptForm;
    if (!date || !time || !doctor || !type) {
      toast.error("يرجى ملء جميع الحقول الإلزامية");
      return;
    }
    if (new Date(date) < new Date(new Date().toDateString())) {
      toast.error("يرجى اختيار تاريخ مستقبلي");
      return;
    }
    if (!user) return;
    setBookingLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "appointments"), {
        ...apptForm,
        createdAt: serverTimestamp(),
      });
      setApptForm({ date: "", time: "", doctor: "", type: "", notes: "" });
      toast.success("تم حجز الموعد بنجاح ✓");
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حجز الموعد");
    } finally {
      setBookingLoading(false);
    }
  }, [apptForm, user]);

  const progress = remaining / FMC_DURATION;
  const kickProgress = Math.min((kicks / KICK_GOAL) * 100, 100);
  const isActive = fmcStatus === "running";
  const upcomingAppts = appointments
    .filter((a) => new Date(a.date) >= new Date(new Date().toDateString()))
    .slice(0, 3);

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm mt-1">
          الأسبوع {gestationalWeek} · تابعي رحلة حملك
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <Baby className="w-5 h-5 text-primary" />, bg: "bg-primary/10", label: "أسبوع الحمل", value: gestationalWeek, unit: "" },
          { icon: <Activity className="w-5 h-5 text-success" />, bg: "bg-success/10", label: "ضغط الدم", value: latestVitals ? `${latestVitals.bloodPressureSystolic}/${latestVitals.bloodPressureDiastolic}` : "--/--", unit: "", ltr: true },
          { icon: <TrendingUp className="w-5 h-5 text-warning" />, bg: "bg-warning/10", label: "سكر الدم", value: latestVitals?.bloodSugar ?? "--", unit: "mg/dL" },
          { icon: <CalendarDays className="w-5 h-5 text-accent" />, bg: "bg-accent/10", label: "الوزن", value: latestVitals?.weight ?? "--", unit: "كجم" },
        ].map((s, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-heading font-bold" dir={s.ltr ? "ltr" : undefined}>
                    {s.value} {s.unit && <span className="text-sm font-normal text-muted-foreground mr-1">{s.unit}</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── FMC Card ── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" />
              عداد حركة الجنين — جلسة ساعتين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-3">
              <TimerRing progress={progress} timeLabel={formatTime(remaining)} />

              <div className="text-5xl font-heading font-bold gradient-text transition-all">
                {kicks}
              </div>
              <p className="text-sm text-muted-foreground">ركلات مسجلة</p>

              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-gradient-to-l from-primary to-primary/60 transition-all duration-300"
                  style={{ width: `${kickProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-left">
                {kicks >= KICK_GOAL ? "✓ تم تحقيق الهدف!" : `الهدف: ${KICK_GOAL} ركلات خلال الجلسة`}
              </p>

              <div className="flex items-center justify-center gap-3 pt-1">
                <Button variant="outline" size="icon" onClick={undoKick} disabled={!isActive || kicks === 0} title="تراجع"><Minus className="h-4 w-4" /></Button>
                <Button size="lg" className="rounded-full w-16 h-16 text-lg shadow-lg" onClick={addKick} disabled={!isActive}><Plus className="h-6 w-6" /></Button>
                <Button variant="outline" size="icon" onClick={resetFMC} title="إعادة تعيين"><RotateCcw className="h-4 w-4" /></Button>
              </div>

              {/* أزرار التحكم بالجلسة والإرسال المبكر */}
              {fmcStatus === "idle" && (
                <Button className="w-full" onClick={startFMC}>
                  <Play className="w-4 h-4 ml-2" /> بدء الجلسة
                </Button>
              )}
              {fmcStatus === "running" && (
                <div className="flex gap-2 w-full pt-2">
                  <Button variant="outline" className="flex-1" onClick={pauseFMC} disabled={sendingReport}>
                    <Pause className="w-4 h-4 ml-2" /> إيقاف مؤقت
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={sendEarlyReport} disabled={sendingReport}>
                    <Send className="w-4 h-4 ml-2" /> إنهاء وإرسال الآن
                  </Button>
                </div>
              )}
              {fmcStatus === "paused" && (
                <div className="flex gap-2 w-full pt-2">
                  <Button className="flex-1" onClick={resumeFMC} disabled={sendingReport}>
                    <Play className="w-4 h-4 ml-2" /> استئناف
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={sendEarlyReport} disabled={sendingReport}>
                    <Send className="w-4 h-4 ml-2" /> إنهاء وإرسال الآن
                  </Button>
                </div>
              )}

              {kicks >= KICK_GOAL && fmcStatus !== "done" && (
                <Badge className="bg-success text-success-foreground mt-2">✓ تم الوصول للهدف! +{KICK_GOAL} ركلات</Badge>
              )}

              {/* Session report */}
              {fmcStatus === "done" && report && (
                <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4 text-sm text-right space-y-2">
                  <p className="font-heading font-semibold text-base flex items-center gap-2">
                    {report.goalMet ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-warning" />}
                    تقرير الجلسة
                  </p>
                  {[
                    ["التاريخ", report.date],
                    ["المدة", "ساعتان كاملتان"],
                    ["عدد الركلات", `${report.kicks} ركلة`],
                    ["تحقق الهدف", report.goalMet ? "نعم ✓" : `لا — ${report.kicks} من ${KICK_GOAL}`],
                    ["الحالة", report.status === "normal" ? "طبيعي" : "يستدعي المتابعة"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                  <Button className="w-full mt-2" onClick={sendFMCReport} disabled={sendingReport}>
                    <Send className="w-4 h-4 ml-2" />
                    {sendingReport ? "جارٍ الإرسال…" : "إرسال التقرير للطبيبة"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Appointments Card ── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> المواعيد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {upcomingAppts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">المواعيد القادمة</p>
                {upcomingAppts.map((a) => (
                  <div key={a.id} className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-1">
                    <p className="font-heading font-semibold text-sm">{formatArabicDate(a.date)}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {a.time}</span>
                      <Badge variant="secondary" className="text-xs">{a.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.doctor}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">لا توجد مواعيد قادمة مجدولة.</p>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">حجز موعد جديد</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">التاريخ</Label>
                  <Input type="date" value={apptForm.date} onChange={(e) => handleApptChange("date", e.target.value)} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الوقت</Label>
                  <Input type="time" value={apptForm.time} onChange={(e) => handleApptChange("time", e.target.value)} className="text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">اسم الطبيب</Label>
                <Input placeholder="د. سارة أحمد" value={apptForm.doctor} onChange={(e) => handleApptChange("doctor", e.target.value)} className="text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">نوع الموعد</Label>
                <Select value={apptForm.type} onValueChange={(v) => handleApptChange("type", v)}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>
                    {["متابعة دورية", "فحص بالموجات فوق الصوتية", "اختبار سكر الحمل", "فحص ضغط الدم", "استشارة طبية"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ملاحظات (اختياري)</Label>
                <Input placeholder="أي تفاصيل إضافية" value={apptForm.notes} onChange={(e) => handleApptChange("notes", e.target.value)} className="text-sm" />
              </div>
              <Button className="w-full" onClick={bookAppointment} disabled={bookingLoading}>
                {bookingLoading ? "جارٍ الحجز…" : "تأكيد الحجز"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}