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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Baby, CalendarDays, Activity, TrendingUp,
  Plus, Minus, RotateCcw, Play, Pause, Send, Clock,
  CheckCircle2, AlertCircle, FlaskConical, Pill, MessageCircle,
  Heart, Utensils,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { usePatientData } from "@/hooks/usePatientData";
import { patientService } from "@/services/patientService";

const FMC_DURATION = 2 * 60 * 60;
const KICK_GOAL = 10;

const appointmentSchema = z.object({
  date: z.string().min(1, "تاريخ الموعد مطلوب"),
  time: z.string().min(1, "وقت الموعد مطلوب"),
  doctor: z.string().min(3, "اسم الطبيب يجب أن يكون 3 أحرف على الأقل"),
  type: z.string().min(1, "نوع الموعد مطلوب"),
  notes: z.string().optional(),
});
type AppointmentFormValues = z.infer<typeof appointmentSchema>;

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatArabicDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

type FMCStatus = "idle" | "running" | "paused" | "done";
interface FMCReport {
  date: string; kicks: number; goalMet: boolean;
  durationSeconds: number; status: "normal" | "needs_followup";
}

function TimerRing({ progress, timeLabel }: { progress: number; timeLabel: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const color = progress < 0.1 ? "#e24b4a" : progress < 0.25 ? "#BA7517" : "#d4537e";
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#f3eef2" strokeWidth="7" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.5s" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold text-gray-800 tabular-nums">{timeLabel}</span>
        <span className="text-[10px] text-gray-400 mt-0.5">المتبقي</span>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { latestVitals, appointments } = usePatientData(user?.uid);
  const [gestationalWeek] = useState(28);
  const [showBooking, setShowBooking] = useState(false);

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<AppointmentFormValues>({ resolver: zodResolver(appointmentSchema), defaultValues: { type: "" } });

  const onSubmitAppointment = async (data: AppointmentFormValues) => {
    if (!user) return;
    if (new Date(data.date) < new Date(new Date().toDateString())) {
      toast.error("يرجى اختيار تاريخ مستقبلي"); return;
    }
    try {
      await patientService.bookAppointment(user.uid, data);
      toast.success("تم حجز الموعد بنجاح ✓");
      reset(); setShowBooking(false);
    } catch { toast.error("حدث خطأ أثناء حجز الموعد"); }
  };

  const [fmcStatus, setFmcStatus] = useState<FMCStatus>("idle");
  const [remaining, setRemaining] = useState(FMC_DURATION);
  const [kicks, setKicks] = useState(0);
  const [report, setReport] = useState<FMCReport | null>(null);
  const [sendingReport, setSendingReport] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const finishSession = useCallback((finalKicks: number) => {
    clearTimer(); setFmcStatus("done"); setRemaining(0);
    const goalMet = finalKicks >= KICK_GOAL;
    setReport({
      date: new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      kicks: finalKicks, goalMet, durationSeconds: FMC_DURATION,
      status: goalMet ? "normal" : "needs_followup",
    });
    toast.success(goalMet ? "انتهت الجلسة! الجنين نشط ✓" : "انتهت الجلسة — يُنصح بمراجعة الطبيبة", { icon: "👶", duration: 4000 });
  }, [clearTimer]);

  const startFMC = useCallback(() => {
    setFmcStatus("running"); setReport(null);
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) { setKicks(k => { finishSession(k); return k; }); return 0; }
        return next;
      });
    }, 1000);
  }, [finishSession]);

  const pauseFMC = useCallback(() => { clearTimer(); setFmcStatus("paused"); }, [clearTimer]);
  const resumeFMC = useCallback(() => {
    setFmcStatus("running");
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) { setKicks(k => { finishSession(k); return k; }); return 0; }
        return next;
      });
    }, 1000);
  }, [finishSession]);

  const resetFMC = useCallback(() => {
    clearTimer(); setFmcStatus("idle"); setRemaining(FMC_DURATION); setKicks(0); setReport(null);
  }, [clearTimer]);

  const addKick = useCallback(() => {
    if (fmcStatus !== "running") return;
    setKicks(prev => { const n = prev + 1; if (n === KICK_GOAL) toast.success("تم الوصول للهدف! ١٠ ركلات ✓", { icon: "🎉" }); return n; });
  }, [fmcStatus]);

  const undoKick = useCallback(() => {
    if (fmcStatus !== "running") return;
    setKicks(prev => Math.max(0, prev - 1));
  }, [fmcStatus]);

  const sendEarlyReport = async () => {
    if (!user) return;
    clearTimer(); setSendingReport(true);
    try {
      const isGoalMet = kicks >= KICK_GOAL;
      await patientService.submitFMCReport(user.uid, user.displayName, {
        date: new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        kicks, goalMet: isGoalMet, durationSeconds: FMC_DURATION - remaining,
        status: isGoalMet ? "normal" : "needs_followup", gestationalWeek,
      });
      toast.success("تم إرسال التقرير للطبيبة ✓", { duration: 3500 });
      resetFMC();
    } catch { toast.error("حدث خطأ أثناء إرسال التقرير"); }
    finally { setSendingReport(false); }
  };

  const sendFMCReport = useCallback(async () => {
    if (!user || !report) return;
    setSendingReport(true);
    try {
      await patientService.submitFMCReport(user.uid, user.displayName, { ...report, gestationalWeek });
      toast.success("تم إرسال التقرير إلى الطبيبة ✓", { duration: 3500 });
      resetFMC();
    } catch { toast.error("حدث خطأ أثناء إرسال التقرير"); }
    finally { setSendingReport(false); }
  }, [user, report, gestationalWeek, resetFMC]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const progress = remaining / FMC_DURATION;
  const kickProgress = Math.min((kicks / KICK_GOAL) * 100, 100);
  const isActive = fmcStatus === "running";
  const upcomingAppts = appointments.filter(a => new Date(a.date) >= new Date(new Date().toDateString())).slice(0, 3);
  const firstName = user?.displayName?.split(" ")[0] || "مريضتي";

  const quickActions = [
    { label: "المؤشرات", icon: Activity, color: "text-rose-500 bg-rose-50 dark:bg-rose-950", path: "/patient/vitals" },
    { label: "التحاليل", icon: FlaskConical, color: "text-blue-500 bg-blue-50 dark:bg-blue-950", path: "/patient/labs" },
    { label: "الأدوية", icon: Pill, color: "text-violet-500 bg-violet-50 dark:bg-violet-950", path: "/patient/medications" },
    { label: "الأعراض", icon: MessageCircle, color: "text-orange-500 bg-orange-50 dark:bg-orange-950", path: "/patient/symptoms" },
    { label: "التغذية", icon: Utensils, color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950", path: "/patient/nutrition" },
    { label: "نفسي", icon: Heart, color: "text-pink-500 bg-pink-50 dark:bg-pink-950", path: "/patient/mental-health" },
  ];

  return (
    <div className="space-y-5 animate-fade-in" dir="rtl">

      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-l from-primary/15 via-primary/8 to-transparent p-5 border border-primary/10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            مرحباً، {firstName} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            الأسبوع <span className="font-bold text-primary">{gestationalWeek}</span> من الحمل · صحتك أولويتنا
          </p>
        </div>
        <Baby className="w-12 h-12 text-primary/25 shrink-0" />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Baby, bg: "bg-primary/10", color: "text-primary", label: "أسبوع الحمل", value: String(gestationalWeek) },
          { icon: TrendingUp, bg: "bg-warning/10", color: "text-warning", label: "الوزن", value: latestVitals?.weight ? `${latestVitals.weight} كجم` : "--" },
          {
            icon: CalendarDays, bg: "bg-accent/10", color: "text-accent", label: "الموعد القادم",
            value: upcomingAppts[0]?.date
              ? new Date(upcomingAppts[0].date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })
              : "لا يوجد"
          },
        ].map((s) => (
          <Card key={s.label} className="glass-card border-transparent bg-white dark:bg-card">
            <CardContent className="p-3 flex flex-col items-center text-center gap-1.5">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground font-medium leading-tight">{s.label}</p>
              <p className="text-base font-heading font-bold text-foreground leading-none">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5 px-0.5">وصول سريع</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {quickActions.map((a) => (
            <button
              key={a.path}
              onClick={() => navigate(a.path)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-card border border-border/50 hover:border-primary/40 hover:shadow-md transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl ${a.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <a.icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-foreground text-center leading-tight">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Appointments + FMC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Appointments Card */}
        <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
          <CardHeader className="border-b bg-muted/10 pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> مواعيدي
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary h-7 px-2.5"
                onClick={() => setShowBooking(!showBooking)}>
                {showBooking ? "إلغاء" : "+ موعد جديد"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {!showBooking ? (
              upcomingAppts.length > 0 ? (
                upcomingAppts.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs truncate">{formatArabicDate(a.date)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{a.time}</span>
                        <Badge variant="secondary" className="text-[9px] py-0 px-1.5 h-4">{a.type}</Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="w-9 h-9 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">لا توجد مواعيد قادمة</p>
                  <p className="text-xs mt-1 opacity-70">اضغطي "+ موعد جديد" لإضافة موعد</p>
                </div>
              )
            ) : (
              <form onSubmit={handleSubmit(onSubmitAppointment)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">التاريخ</Label>
                    <Input type="date" {...register("date")} className={`text-sm h-9 ${errors.date ? "border-destructive" : ""}`} />
                    {errors.date && <p className="text-[10px] text-destructive">{errors.date.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الوقت</Label>
                    <Input type="time" {...register("time")} className={`text-sm h-9 ${errors.time ? "border-destructive" : ""}`} />
                    {errors.time && <p className="text-[10px] text-destructive">{errors.time.message}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">اسم الطبيب</Label>
                  <Input placeholder="د. سارة أحمد" {...register("doctor")} className={`text-sm h-9 ${errors.doctor ? "border-destructive" : ""}`} />
                  {errors.doctor && <p className="text-[10px] text-destructive">{errors.doctor.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">نوع الموعد</Label>
                  <Select onValueChange={val => setValue("type", val, { shouldValidate: true })}>
                    <SelectTrigger className={`text-sm h-9 ${errors.type ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="اختر النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      {["متابعة دورية", "فحص بالموجات فوق الصوتية", "اختبار سكر الحمل", "استشارة طبية"].map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-[10px] text-destructive">{errors.type.message}</p>}
                </div>
                <Input placeholder="ملاحظات (اختياري)" {...register("notes")} className="text-sm h-9" />
                <Button type="submit" className="w-full h-10" disabled={isSubmitting}>
                  {isSubmitting ? "جارٍ الحجز…" : "تأكيد الحجز"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* FMC Card */}
        <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
          <CardHeader className="border-b bg-muted/10 pb-3 pt-4 px-4">
            <CardTitle className="font-heading text-sm flex items-center gap-2">
              <Baby className="w-4 h-4 text-primary" /> متابعة حركة الجنين
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col items-center gap-3">
              <TimerRing progress={progress} timeLabel={formatTime(remaining)} />

              <div className="text-center">
                <div className="text-4xl font-heading font-bold text-foreground">{kicks}</div>
                <p className="text-xs text-muted-foreground mt-0.5">ركلات مسجلة</p>
              </div>

              <div className="w-full space-y-1">
                <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-gradient-to-l from-primary to-primary/60 transition-all duration-300"
                    style={{ width: `${kickProgress}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {kicks >= KICK_GOAL ? "✓ اكتمل الهدف!" : `الهدف: ${KICK_GOAL} ركلات`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={undoKick} disabled={!isActive || kicks === 0} className="h-10 w-10 rounded-full">
                  <Minus className="h-4 w-4" />
                </Button>
                <Button size="lg" className="rounded-full w-14 h-14 shadow-md hover:scale-105 transition-all" onClick={addKick} disabled={!isActive}>
                  <Plus className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" onClick={resetFMC} className="h-10 w-10 rounded-full">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="w-full">
                {fmcStatus === "idle" && (
                  <Button className="w-full h-10" onClick={startFMC}>
                    <Play className="w-4 h-4 ml-2" /> ابدأ الجلسة
                  </Button>
                )}
                {(fmcStatus === "running" || fmcStatus === "paused") && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-10"
                      onClick={fmcStatus === "running" ? pauseFMC : resumeFMC} disabled={sendingReport}>
                      {fmcStatus === "running"
                        ? <><Pause className="w-3.5 h-3.5 ml-1" /> إيقاف</>
                        : <><Play className="w-3.5 h-3.5 ml-1" /> استئناف</>}
                    </Button>
                    <Button variant="destructive" className="flex-1 h-10" onClick={sendEarlyReport} disabled={sendingReport}>
                      <Send className="w-3.5 h-3.5 ml-1" /> إنهاء وإرسال
                    </Button>
                  </div>
                )}
              </div>

              {kicks >= KICK_GOAL && fmcStatus !== "done" && (
                <Badge className="bg-success/10 text-success border-success/20 text-xs py-1">✓ تم الوصول للهدف!</Badge>
              )}

              {fmcStatus === "done" && report && (
                <div className="w-full rounded-xl bg-muted/30 p-3 space-y-2">
                  <p className="font-bold text-sm flex items-center gap-1.5">
                    {report.goalMet
                      ? <CheckCircle2 className="w-4 h-4 text-success" />
                      : <AlertCircle className="w-4 h-4 text-warning" />}
                    تقرير الجلسة
                  </p>
                  {[
                    ["الركلات", `${report.kicks} ركلة`],
                    ["الهدف", report.goalMet ? "✓ محقق" : "غير محقق"],
                    ["الحالة", report.status === "normal" ? "طبيعي" : "يستدعي المتابعة"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-1 border-b border-border/30 last:border-0">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                  <Button className="w-full h-9 mt-1" onClick={sendFMCReport} disabled={sendingReport}>
                    <Send className="w-3.5 h-3.5 ml-2" />
                    {sendingReport ? "جارٍ الإرسال…" : "إرسال للطبيبة"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}