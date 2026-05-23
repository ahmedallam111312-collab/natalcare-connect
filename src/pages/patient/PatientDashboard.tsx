import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { usePatientData } from "@/hooks/usePatientData";
import { patientService } from "@/services/patientService";

// ─── Constants ────────────────────────────────────────────────────────────────
const FMC_DURATION = 2 * 60 * 60; // 2 hours in seconds
const KICK_GOAL = 10;

// ─── Zod Schema for Appointment ───────────────────────────────────────────────
const appointmentSchema = z.object({
  date: z.string().min(1, "تاريخ الموعد مطلوب"),
  time: z.string().min(1, "وقت الموعد مطلوب"),
  doctor: z.string().min(3, "اسم الطبيب يجب أن يكون 3 أحرف على الأقل"),
  type: z.string().min(1, "نوع الموعد مطلوب"),
  notes: z.string().optional(),
});
type AppointmentFormValues = z.infer<typeof appointmentSchema>;

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
  const { latestVitals, appointments } = usePatientData(user?.uid);
  const [gestationalWeek] = useState(28);

  // ── Appointment booking form (react-hook-form) ──────────────────────────
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { type: "" }, // required for select to work correctly
  });

  const onSubmitAppointment = async (data: AppointmentFormValues) => {
    if (!user) return;
    if (new Date(data.date) < new Date(new Date().toDateString())) {
      toast.error("يرجى اختيار تاريخ مستقبلي");
      return;
    }
    try {
      await patientService.bookAppointment(user.uid, data);
      toast.success("تم حجز الموعد بنجاح ✓");
      reset();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حجز الموعد");
    }
  };

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

  const sendEarlyReport = async () => {
    if (!user) return;
    clearTimer();
    setSendingReport(true);
    try {
      const elapsedSeconds = FMC_DURATION - remaining;
      const isGoalMet = kicks >= KICK_GOAL;
      
      await patientService.submitFMCReport(user.uid, user.displayName, {
        date: new Date().toLocaleDateString("ar-EG", {
          weekday: "long", year: "numeric", month: "long", day: "numeric",
          hour: "2-digit", minute: "2-digit",
        }),
        kicks,
        goalMet: isGoalMet,
        durationSeconds: elapsedSeconds,
        status: isGoalMet ? "normal" : "needs_followup",
        gestationalWeek,
      });

      toast.success("تم إرسال التقرير الحالي للطبيبة بنجاح ✓", { duration: 3500 });
      resetFMC();
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء إرسال التقرير، يرجى المحاولة مجدداً");
    } finally {
      setSendingReport(false);
    }
  };

  const sendFMCReport = useCallback(async () => {
    if (!user || !report) return;
    setSendingReport(true);
    try {
      await patientService.submitFMCReport(user.uid, user.displayName, {
        ...report,
        gestationalWeek,
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

  const progress = remaining / FMC_DURATION;
  const kickProgress = Math.min((kicks / KICK_GOAL) * 100, 100);
  const isActive = fmcStatus === "running";
  const upcomingAppts = appointments
    .filter((a) => new Date(a.date) >= new Date(new Date().toDateString()))
    .slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-3xl font-heading font-bold text-foreground">لوحة التحكم السريرية</h1>
        <p className="text-muted-foreground text-sm mt-2">
          الأسبوع {gestationalWeek} · تابعي رحلة حملك بأمان وتواصل دائم مع عيادتك
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { icon: <Baby className="w-6 h-6 text-primary" />, bg: "bg-primary/10", label: "أسبوع الحمل", value: gestationalWeek, unit: "" },
          { icon: <TrendingUp className="w-6 h-6 text-warning" />, bg: "bg-warning/10", label: "سكر الدم", value: latestVitals?.bloodSugar ?? "--", unit: "mg/dL" },
          { icon: <CalendarDays className="w-6 h-6 text-accent" />, bg: "bg-accent/10", label: "الوزن", value: latestVitals?.weight ?? "--", unit: "كجم" },
        ].map((s, i) => (
          <Card key={i} className="glass-card hover:shadow-lg transition-shadow border-transparent bg-white dark:bg-card">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full ${s.bg} flex items-center justify-center shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{s.label}</p>
                  <p className="text-3xl font-heading font-bold text-foreground" dir={s.ltr ? "ltr" : undefined}>
                    {s.value} {s.unit && <span className="text-sm font-normal text-muted-foreground ml-1">{s.unit}</span>}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* ── FMC Card ── */}
        <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Baby className="w-5 h-5 text-primary" />
              متابعة نشاط الجنين
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <TimerRing progress={progress} timeLabel={formatTime(remaining)} />

              <div className="text-6xl font-heading font-bold text-foreground transition-all">
                {kicks}
              </div>
              <p className="text-sm font-medium text-muted-foreground">ركلات مسجلة اليوم</p>

              <div className="w-full bg-muted/50 rounded-full h-3 overflow-hidden mt-4">
                <div
                  className="h-3 rounded-full bg-gradient-to-l from-primary to-primary/60 transition-all duration-300 shadow-inner"
                  style={{ width: `${kickProgress}%` }}
                />
              </div>
              <p className="text-xs font-medium text-muted-foreground text-left mt-2">
                {kicks >= KICK_GOAL ? "✓ اكتمل الهدف اليومي!" : `الهدف: ${KICK_GOAL} ركلات`}
              </p>

              <div className="flex items-center justify-center gap-4 pt-4">
                <Button variant="outline" size="icon" onClick={undoKick} disabled={!isActive || kicks === 0} title="تراجع" className="h-12 w-12 rounded-full"><Minus className="h-5 w-5" /></Button>
                <Button size="lg" className="rounded-full w-20 h-20 text-lg shadow-md hover:shadow-lg hover:scale-105 transition-all" onClick={addKick} disabled={!isActive}><Plus className="h-8 w-8" /></Button>
                <Button variant="outline" size="icon" onClick={resetFMC} title="إعادة تعيين" className="h-12 w-12 rounded-full"><RotateCcw className="h-5 w-5" /></Button>
              </div>

              {/* أزرار التحكم بالجلسة والإرسال المبكر */}
              <div className="pt-6">
                {fmcStatus === "idle" && (
                  <Button className="w-full h-12 text-md shadow-sm" onClick={startFMC}>
                    <Play className="w-5 h-5 ml-2" /> ابدأ جلسة المتابعة
                  </Button>
                )}
                {fmcStatus === "running" && (
                  <div className="flex gap-3 w-full">
                    <Button variant="outline" className="flex-1 h-12" onClick={pauseFMC} disabled={sendingReport}>
                      <Pause className="w-4 h-4 ml-2" /> إيقاف
                    </Button>
                    <Button variant="destructive" className="flex-1 h-12 shadow-sm" onClick={sendEarlyReport} disabled={sendingReport}>
                      <Send className="w-4 h-4 ml-2" /> إنهاء وإرسال
                    </Button>
                  </div>
                )}
                {fmcStatus === "paused" && (
                  <div className="flex gap-3 w-full">
                    <Button className="flex-1 h-12 shadow-sm" onClick={resumeFMC} disabled={sendingReport}>
                      <Play className="w-4 h-4 ml-2" /> استئناف
                    </Button>
                    <Button variant="destructive" className="flex-1 h-12 shadow-sm" onClick={sendEarlyReport} disabled={sendingReport}>
                      <Send className="w-4 h-4 ml-2" /> إنهاء وإرسال
                    </Button>
                  </div>
                )}
              </div>

              {kicks >= KICK_GOAL && fmcStatus !== "done" && (
                <Badge className="bg-success/10 text-success border-success/20 mt-4 text-sm py-1.5 px-3">✓ تم الوصول للهدف! +{KICK_GOAL} ركلات</Badge>
              )}

              {/* Session report */}
              {fmcStatus === "done" && report && (
                <div className="mt-6 rounded-xl border border-transparent bg-muted/30 p-5 text-sm text-right space-y-3">
                  <p className="font-heading font-semibold text-lg flex items-center gap-2 mb-2">
                    {report.goalMet ? <CheckCircle2 className="w-5 h-5 text-success" /> : <AlertCircle className="w-5 h-5 text-warning" />}
                    تقرير الجلسة
                  </p>
                  {[
                    ["التاريخ", report.date],
                    ["المدة", "ساعتان كاملتان"],
                    ["عدد الركلات", `${report.kicks} ركلة`],
                    ["تحقق الهدف", report.goalMet ? "نعم ✓" : `لا — ${report.kicks} من ${KICK_GOAL}`],
                    ["الحالة", report.status === "normal" ? "طبيعي" : "يستدعي المتابعة"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm py-1 border-b border-border/40 last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold text-foreground">{v}</span>
                    </div>
                  ))}
                  <Button className="w-full mt-4 h-11" onClick={sendFMCReport} disabled={sendingReport}>
                    <Send className="w-4 h-4 ml-2" />
                    {sendingReport ? "جارٍ الإرسال…" : "إرسال التقرير للطبيبة الآن"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Appointments Card ── */}
        <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
          <CardHeader className="border-b bg-muted/10 pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> مواعيدي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
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
              <form onSubmit={handleSubmit(onSubmitAppointment)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">التاريخ</Label>
                    <Input type="date" {...register("date")} className={`text-sm ${errors.date ? 'border-destructive' : ''}`} />
                    {errors.date && <p className="text-[10px] text-destructive">{errors.date.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الوقت</Label>
                    <Input type="time" {...register("time")} className={`text-sm ${errors.time ? 'border-destructive' : ''}`} />
                    {errors.time && <p className="text-[10px] text-destructive">{errors.time.message}</p>}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">اسم الطبيب</Label>
                  <Input placeholder="د. سارة أحمد" {...register("doctor")} className={`text-sm ${errors.doctor ? 'border-destructive' : ''}`} />
                  {errors.doctor && <p className="text-[10px] text-destructive">{errors.doctor.message}</p>}
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">نوع الموعد</Label>
                  <Select onValueChange={(val) => setValue("type", val, { shouldValidate: true })}>
                    <SelectTrigger className={`text-sm ${errors.type ? 'border-destructive' : ''}`}>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {["متابعة دورية", "فحص بالموجات فوق الصوتية", "اختبار سكر الحمل", "فحص ضغط الدم", "استشارة طبية"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-[10px] text-destructive">{errors.type.message}</p>}
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">ملاحظات (اختياري)</Label>
                  <Input placeholder="أي تفاصيل إضافية" {...register("notes")} className="text-sm" />
                </div>
                
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "جارٍ الحجز…" : "تأكيد الحجز"}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}