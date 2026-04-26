import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Pill, Clock, CheckCircle2, Plus, Loader2, Calendar,
  AlertTriangle, User, Search, Trash2, Pencil, TrendingUp,
  Bell, BellOff, Stethoscope, BarChart3, Zap, ShieldCheck,
  Flame, X, Activity
} from "lucide-react";
import {
  collection, query, onSnapshot, doc, updateDoc, addDoc, deleteDoc,
  serverTimestamp, arrayUnion, orderBy
} from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toLocaleDateString("en-CA");

const FREQ_OPTIONS = [
  "مرة يومياً", "مرتين يومياً", "ثلاث مرات يومياً",
  "كل 8 ساعات", "عند اللزوم", "مرة أسبوعياً"
];

const EMPTY_FORM = { name: "", dosage: "", frequency: "مرة يومياً", notes: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (ts: any): string => {
  if (!ts) return "غير محدد";
  const d = ts.toDate ? ts.toDate() : typeof ts === "string" ? new Date(ts) : null;
  if (!d) return "غير محدد";
  return d.toLocaleDateString("ar-EG", { month: "short", day: "numeric", year: "numeric" });
};

const getLast7 = (dates: string[] = []) =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { taken: dates.includes(d.toLocaleDateString("en-CA")) };
  });

const adherenceMeta = (v: number) => {
  if (v >= 90) return { color: "#10b981", label: "ممتاز", grade: "A" };
  if (v >= 70) return { color: "#f59e0b", label: "جيد",   grade: "B" };
  if (v >= 50) return { color: "#f97316", label: "متوسط", grade: "C" };
  return         { color: "#ef4444", label: "ضعيف",  grade: "D" };
};

// ─── Missed Dose Alert Banner ─────────────────────────────────────────────────

function MissedDoseBanner({ count, names }: { count: number; names: string[] }) {
  const [dismissed, setDismissed] = useState(false);
  if (!count || dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 alert-pulse"
      style={{
        background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 40%, #b91c1c 100%)",
        boxShadow: "0 8px 32px rgba(239,68,68,0.35), 0 2px 8px rgba(0,0,0,0.2)",
      }}>
      {/* Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[120, 180, 240].map((s, i) => (
          <div key={i} className="alert-ring absolute rounded-full"
            style={{
              top: -s * 0.17, right: -s * 0.17,
              width: s, height: s,
              border: "1.5px solid rgba(255,255,255,0.12)",
              animationDelay: `${i * 0.5}s`,
            }} />
        ))}
      </div>

      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 alert-icon-pulse"
          style={{ background: "rgba(255,255,255,0.15)", border: "2px solid rgba(255,255,255,0.3)" }}>
          <AlertTriangle size={22} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-black text-white text-base">
            {count === 1 ? "جرعة فائتة اليوم!" : `${count} جرعات فائتة اليوم!`}
          </p>
          <p className="text-red-200 text-xs mt-1">
            {names.slice(0, 3).join(" · ")}{names.length > 3 ? ` و${names.length - 3} أخرى` : ""}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {names.slice(0, 4).map((n, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}>{n}</span>
            ))}
          </div>
        </div>
        <button onClick={() => setDismissed(true)}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.1)" }}>
          <X size={14} className="text-white/70" />
        </button>
      </div>
    </div>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ takenDates, color }: { takenDates: string[]; color: string }) {
  const days = getLast7(takenDates);
  return (
    <div className="flex items-end gap-1 h-8">
      {days.map((d, i) => (
        <div key={i} className="flex-1 rounded-sm transition-all duration-700"
          style={{
            height: d.taken ? "100%" : "25%",
            background: d.taken ? color : "rgba(148,163,184,0.2)",
            minHeight: 3,
          }} />
      ))}
    </div>
  );
}

// ─── Circular Progress ────────────────────────────────────────────────────────

function CircularProgress({ value, color, size = 54 }: { value: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={5} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.34,1.56,0.64,1)" }} />
    </svg>
  );
}

// ─── Medication Card ──────────────────────────────────────────────────────────

interface MedCardProps {
  med: any; index: number;
  onToggleReminder: (id: string, cur: boolean) => void;
  onMarkTaken: (med: any) => void;
  onDelete: (id: string, name: string) => void;
  onEdit: (med: any) => void;
}

function MedCard({ med, index, onToggleReminder, onMarkTaken, onDelete, onEdit }: MedCardProps) {
  const isTaken   = (med.takenDates || []).includes(TODAY);
  const isDoctor  = med.prescribedBy && med.prescribedBy !== "إضافة شخصية";
  const adherence = med.adherence ?? 0;
  const meta      = adherenceMeta(adherence);
  const accent    = isTaken ? "#10b981" : isDoctor ? "#6366f1" : "#64748b";

  return (
    <div className="med-card rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        animationDelay: `${index * 70}ms`,
        background: "white",
        boxShadow: isTaken
          ? "0 4px 24px rgba(16,185,129,0.18), 0 1px 6px rgba(0,0,0,0.05)"
          : !isTaken && isDoctor
          ? "0 4px 24px rgba(239,68,68,0.1), 0 1px 6px rgba(0,0,0,0.05)"
          : "0 4px 16px rgba(0,0,0,0.07)",
        border: `1.5px solid ${isTaken ? "rgba(16,185,129,0.25)" : !isTaken && isDoctor ? "rgba(239,68,68,0.18)" : "rgba(226,232,240,0.8)"}`,
      }}>

      {/* Top accent bar */}
      <div className="h-1.5" style={{
        background: isTaken
          ? "linear-gradient(90deg,#10b981,#34d399,#6ee7b7)"
          : isDoctor
          ? "linear-gradient(90deg,#6366f1,#818cf8,#a5b4fc)"
          : "linear-gradient(90deg,#94a3b8,#cbd5e1)"
      }} />

      {/* Header */}
      <div className="px-5 pt-4 pb-3"
        style={{ background: isTaken ? "rgba(16,185,129,0.03)" : isDoctor ? "rgba(99,102,241,0.03)" : "rgba(248,250,252,0.8)" }}>
        <div className="flex items-start gap-3">
          {/* Circular adherence + pill icon */}
          <div className="relative flex-shrink-0">
            <CircularProgress value={adherence} color={meta.color} size={54} />
            <div className="absolute inset-1.5 rounded-full flex items-center justify-center"
              style={{ background: `${accent}22` }}>
              <Pill size={16} style={{ color: accent }} />
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-black text-slate-800 text-base leading-tight">{med.name}</h3>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                    style={{ background: `${accent}18`, color: accent }}>{med.dosage}</span>
                  {isDoctor && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                      style={{ background: "rgba(99,102,241,0.1)", color: "#6366f1" }}>
                      <Stethoscope size={9} /> طبيب
                    </span>
                  )}
                  {isTaken
                    ? <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{ background: "rgba(16,185,129,0.1)", color: "#059669" }}>
                        <CheckCircle2 size={9} /> مكتملة
                      </span>
                    : isDoctor
                    ? <span className="missed-badge text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
                        <AlertTriangle size={9} /> فائتة
                      </span>
                    : null
                  }
                </div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button onClick={() => onEdit(med)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-300 hover:text-indigo-500 hover:bg-indigo-50">
                  <Pencil size={13} />
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-all text-slate-300 hover:text-red-500 hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent dir="rtl" className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="font-black">حذف {med.name}؟</AlertDialogTitle>
                      <AlertDialogDescription>سيتم حذف الدواء وسجل الجرعات نهائياً.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row-reverse gap-2">
                      <AlertDialogAction onClick={() => onDelete(med.id, med.name)}
                        className="bg-red-500 hover:bg-red-600 rounded-xl font-bold">حذف</AlertDialogAction>
                      <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-5 space-y-3.5">
        {/* Frequency + Notes pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(245,158,11,0.1)" }}>
            <Clock size={12} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-800">{med.frequency || "—"}</span>
          </div>
          {med.notes && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-1 min-w-0"
              style={{ background: "rgba(14,165,233,0.08)" }}>
              <Activity size={12} className="text-sky-500 flex-shrink-0" />
              <span className="text-xs text-sky-700 truncate">{med.notes}</span>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <User size={11} />
            <span className={isDoctor ? "font-bold text-indigo-600" : ""}>{med.prescribedBy || "إضافة شخصية"}</span>
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={11} />{formatDate(med.prescribedAt || med.createdAt)}
          </span>
        </div>

        {/* 7-day chart + adherence */}
        <div className="rounded-xl p-3 space-y-2"
          style={{ background: `${meta.color}08`, border: `1px solid ${meta.color}20` }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
              <BarChart3 size={11} /> آخر 7 أيام
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black" style={{ color: meta.color }}>{adherence}%</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-black text-white"
                style={{ background: meta.color }}>{meta.grade}</span>
              <span className="text-[10px] text-slate-400">{meta.label}</span>
            </div>
          </div>
          <Sparkline takenDates={med.takenDates || []} color={meta.color} />
          {/* linear progress */}
          <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(148,163,184,0.15)" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${adherence}%`, background: `linear-gradient(90deg,${meta.color}88,${meta.color})` }} />
          </div>
        </div>

        {/* Reminder */}
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            {med.reminders ? <Bell size={14} className="text-indigo-500" /> : <BellOff size={14} className="text-slate-300" />}
            {med.reminders ? "التنبيهات مفعّلة" : "التنبيهات معطّلة"}
          </div>
          <Switch checked={!!med.reminders} onCheckedChange={() => onToggleReminder(med.id, med.reminders)} />
        </div>

        {/* CTA */}
        <button
          disabled={isTaken}
          onClick={() => onMarkTaken(med)}
          className="w-full h-12 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-95"
          style={isTaken
            ? { background: "rgba(16,185,129,0.08)", color: "#059669", cursor: "not-allowed", border: "2px solid rgba(16,185,129,0.2)" }
            : {
                background: `linear-gradient(135deg,${isDoctor ? "#6366f1,#4f46e5" : "#059669,#047857"})`,
                color: "white",
                boxShadow: `0 6px 20px ${isDoctor ? "rgba(99,102,241,0.4)" : "rgba(5,150,105,0.4)"}`,
              }
          }
        >
          {isTaken
            ? <><CheckCircle2 size={17} className="text-emerald-500" /> تم أخذ الجرعة اليوم ✓</>
            : <><Zap size={15} /> تسجيل أخذ الجرعة الآن</>
          }
        </button>
      </div>
    </div>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

interface FormDialogProps {
  open: boolean; onOpenChange: (v: boolean) => void;
  initial?: any;
  onSubmit: (data: typeof EMPTY_FORM, editId?: string) => Promise<void>;
  isLoading: boolean;
}

function MedFormDialog({ open, onOpenChange, initial, onSubmit, isLoading }: FormDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const isEdit = !!initial;

  useEffect(() => {
    setForm(initial
      ? { name: initial.name || "", dosage: initial.dosage || "", frequency: initial.frequency || "مرة يومياً", notes: initial.notes || "" }
      : EMPTY_FORM);
  }, [initial, open]);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md rounded-2xl border-0 shadow-2xl p-0 overflow-hidden">
        <div className="px-6 pt-6 pb-5" style={{ background: "linear-gradient(135deg,#1e293b,#0f172a)" }}>
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.25)", border: "1px solid rgba(99,102,241,0.3)" }}>
                {isEdit ? <Pencil size={16} className="text-indigo-400" /> : <Plus size={16} className="text-indigo-400" />}
              </div>
              <span className="font-black text-white text-lg">
                {isEdit ? "تعديل الدواء" : "إضافة دواء جديد"}
              </span>
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <Label className="text-xs font-bold text-slate-500 mb-2 block">اسم الدواء / المكمل *</Label>
            <input value={form.name} onChange={set("name")} placeholder="مثال: حمض الفوليك"
              className="med-input" dir="rtl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-2 block">الجرعة *</Label>
              <input value={form.dosage} onChange={set("dosage")} placeholder="500 مجم"
                className="med-input" dir="rtl" />
            </div>
            <div>
              <Label className="text-xs font-bold text-slate-500 mb-2 block">التكرار</Label>
              <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-slate-200 text-sm font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {FREQ_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-bold text-slate-500 mb-2 block">ملاحظات (اختياري)</Label>
            <input value={form.notes} onChange={set("notes")} placeholder="مثال: بعد الأكل مباشرة..."
              className="med-input" dir="rtl" />
          </div>
          <button
            onClick={() => onSubmit(form, initial?.id)}
            disabled={isLoading || !form.name.trim() || !form.dosage.trim()}
            className="w-full h-12 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 6px 20px rgba(99,102,241,0.4)" }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : isEdit ? <ShieldCheck size={16} /> : <Plus size={16} />}
            {isLoading ? "جاري الحفظ..." : isEdit ? "حفظ التعديلات" : "إضافة الدواء"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, value, label, color, delay }: { icon: React.ReactNode; value: string | number; label: string; color: string; delay: number }) {
  return (
    <div className="stat-chip med-card rounded-2xl flex items-center gap-3 px-4 py-3"
      style={{ animationDelay: `${delay}ms`, background: "white", border: "1.5px solid rgba(226,232,240,0.7)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div className="text-xl font-black text-slate-800 leading-tight">{value}</div>
        <div className="text-[11px] text-slate-400 font-medium">{label}</div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Medications() {
  const { user } = useAuthStore();
  const [meds, setMeds]           = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch]       = useState("");
  const [filter, setFilter]       = useState<"all" | "doctor" | "personal" | "pending">("all");

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "medications"), orderBy("prescribedAt", "desc"));
    const unsub = onSnapshot(q,
      snap => setMeds(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      () => {
        onSnapshot(query(collection(db, "users", user.uid, "medications")),
          snap => setMeds(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
      }
    );
    return unsub;
  }, [user]);

  const displayed = useMemo(() => {
    let list = meds;
    if (filter === "doctor")   list = list.filter(m => m.prescribedBy && m.prescribedBy !== "إضافة شخصية");
    if (filter === "personal") list = list.filter(m => !m.prescribedBy || m.prescribedBy === "إضافة شخصية");
    if (filter === "pending")  list = list.filter(m => !(m.takenDates || []).includes(TODAY));
    if (search.trim())         list = list.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [meds, filter, search]);

  const stats = useMemo(() => ({
    total:      meds.length,
    takenToday: meds.filter(m => (m.takenDates || []).includes(TODAY)).length,
    fromDoctor: meds.filter(m => m.prescribedBy && m.prescribedBy !== "إضافة شخصية").length,
    avgAdh:     meds.length ? Math.round(meds.reduce((s, m) => s + (m.adherence || 0), 0) / meds.length) : 0,
  }), [meds]);

  const missedMeds = useMemo(() => meds.filter(m => !(m.takenDates || []).includes(TODAY)), [meds]);

  const handleSubmit = async (form: typeof EMPTY_FORM, editId?: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (editId) {
        await updateDoc(doc(db, "users", user.uid, "medications", editId),
          { name: form.name, dosage: form.dosage, frequency: form.frequency, notes: form.notes });
        toast.success("تم تعديل الدواء ✓");
        setEditTarget(null);
      } else {
        await addDoc(collection(db, "users", user.uid, "medications"), {
          name: form.name, dosage: form.dosage, frequency: form.frequency, notes: form.notes,
          reminders: true, adherence: 100, takenDates: [],
          prescribedAt: serverTimestamp(), prescribedBy: "إضافة شخصية",
        });
        toast.success("تمت إضافة الدواء ✓");
        setIsAddOpen(false);
      }
    } catch { toast.error("حدث خطأ، حاولي مجدداً"); }
    finally   { setIsLoading(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!user) return;
    try { await deleteDoc(doc(db, "users", user.uid, "medications", id)); toast.success(`تم حذف ${name}`); }
    catch { toast.error("فشل الحذف"); }
  };

  const toggleReminder = async (id: string, cur: boolean) => {
    if (!user) return;
    try { await updateDoc(doc(db, "users", user.uid, "medications", id), { reminders: !cur }); }
    catch { toast.error("فشل التحديث"); }
  };

  const handleMarkTaken = async (med: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "medications", med.id), {
        takenDates: arrayUnion(TODAY),
        adherence: Math.min(100, (med.adherence || 0) + 5),
      });
      toast.success(`✅ تم تسجيل جرعة ${med.name}`);
    } catch { toast.error("حدث خطأ"); }
  };

  const FILTERS = [
    { key: "all",      label: "الكل",    count: meds.length, urgent: false },
    { key: "pending",  label: "فائتة",   count: missedMeds.length, urgent: true },
    { key: "doctor",   label: "الطبيب",  count: stats.fromDoctor, urgent: false },
    { key: "personal", label: "شخصية",   count: meds.length - stats.fromDoctor, urgent: false },
  ] as const;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap');

        .med-page { font-family: 'IBM Plex Sans Arabic', sans-serif; }

        .med-card {
          animation: medIn 0.4s cubic-bezier(0.34,1.2,0.64,1) both;
        }
        @keyframes medIn {
          from { opacity:0; transform:translateY(14px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }

        .alert-ring {
          animation: ringPulse 3s ease-in-out infinite;
        }
        @keyframes ringPulse {
          0%,100% { transform:scale(0.9); opacity:.4; }
          50%      { transform:scale(1.05); opacity:.1; }
        }

        .alert-icon-pulse {
          animation: iconBeat 2s ease-in-out infinite;
        }
        @keyframes iconBeat {
          0%,100% { transform:scale(1); }
          50%      { transform:scale(1.1); box-shadow:0 0 0 8px rgba(255,255,255,0); }
        }

        .missed-badge {
          animation: missedFlash 2.5s ease-in-out infinite;
        }
        @keyframes missedFlash {
          0%,100% { opacity:1; }
          50%      { opacity:.5; }
        }

        .med-input {
          width:100%; height:44px; padding:0 14px; border-radius:12px;
          border:1.5px solid #e2e8f0; font-size:14px; font-family:inherit;
          background:#f8fafc; outline:none; color:#1e293b;
          transition: border-color .15s, box-shadow .15s, background .15s;
        }
        .med-input:focus {
          border-color:#6366f1; background:white;
          box-shadow:0 0 0 3px rgba(99,102,241,.12);
        }
        .med-input::placeholder { color:#94a3b8; }

        .stat-chip { transition:transform .2s, box-shadow .2s; }
        .stat-chip:hover { transform:translateY(-2px); }
      `}</style>

      <div className="med-page space-y-5 pb-10" dir="rtl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#059669,#047857)", boxShadow: "0 4px 12px rgba(5,150,105,.4)" }}>
                <Pill size={18} className="text-white" />
              </div>
              الأدوية والمكملات
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              {meds.length === 0
                ? "أضيفي أدويتك وتابعي جرعاتك اليومية"
                : `${stats.takenToday} من ${stats.total} جرعة مأخوذة اليوم`}
            </p>
          </div>
          <button onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 h-11 px-5 rounded-xl font-black text-sm text-white transition-all active:scale-95 hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 6px 20px rgba(99,102,241,.4)" }}>
            <Plus size={16} /> إضافة دواء
          </button>
        </div>

        {/* ── Missed Dose Alert ── */}
        {missedMeds.length > 0 && (
          <MissedDoseBanner count={missedMeds.length} names={missedMeds.map(m => m.name)} />
        )}

        {/* ── Stats ── */}
        {meds.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatChip icon={<Pill size={18} />}        value={stats.total}                   label="إجمالي الأدوية"  color="#6366f1" delay={0}   />
            <StatChip icon={<CheckCircle2 size={18} />} value={`${stats.takenToday}/${stats.total}`} label="مأخوذة اليوم" color="#10b981" delay={80}  />
            <StatChip icon={<Stethoscope size={18} />} value={stats.fromDoctor}              label="من الطبيب"      color="#6366f1" delay={160} />
            <StatChip icon={<Flame size={18} />}       value={`${stats.avgAdh}%`}            label="متوسط الالتزام" color={adherenceMeta(stats.avgAdh).color} delay={240} />
          </div>
        )}

        {/* ── Search + Filters ── */}
        {meds.length > 0 && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="med-input pr-10" placeholder="ابحثي عن دواء بالاسم..."
                value={search} onChange={e => setSearch(e.target.value)} dir="rtl" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl text-sm font-bold transition-all active:scale-95"
                  style={filter === f.key
                    ? {
                        background: f.urgent && f.count > 0 ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#6366f1,#4f46e5)",
                        color: "white",
                        boxShadow: `0 4px 14px ${f.urgent && f.count > 0 ? "rgba(220,38,38,.35)" : "rgba(99,102,241,.35)"}`,
                      }
                    : { background: "white", color: "#64748b", border: "1.5px solid #e2e8f0" }
                  }>
                  {f.label}
                  {f.count > 0 && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                      style={{
                        background: filter === f.key ? "rgba(255,255,255,.25)" : f.urgent ? "rgba(239,68,68,.15)" : "rgba(99,102,241,.12)",
                        color: filter === f.key ? "white" : f.urgent ? "#dc2626" : "#6366f1",
                      }}>
                      {f.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty ── */}
        {meds.length === 0 ? (
          <div className="text-center py-20 med-card">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "linear-gradient(135deg,#eef2ff,#e0e7ff)" }}>
              <Pill size={40} className="text-indigo-400" />
            </div>
            <p className="font-black text-slate-700 text-xl mb-2">لا توجد أدوية بعد</p>
            <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              ستظهر هنا الأدوية الموصوفة من طبيبك، أو يمكنك إضافتها يدوياً
            </p>
            <button onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-2 h-11 px-7 rounded-xl font-black text-sm text-white"
              style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", boxShadow: "0 6px 20px rgba(99,102,241,.4)" }}>
              <Plus size={15} /> أضيفي دواءك الأول
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-14 text-slate-400 med-card">
            <Search size={36} className="mx-auto mb-3 opacity-20" />
            <p className="font-bold">لا توجد نتائج مطابقة</p>
            <p className="text-sm mt-1">جربي مصطلح بحث مختلف أو غيري الفلتر</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayed.map((med, i) => (
              <MedCard key={med.id} med={med} index={i}
                onToggleReminder={toggleReminder}
                onMarkTaken={handleMarkTaken}
                onDelete={handleDelete}
                onEdit={setEditTarget}
              />
            ))}
          </div>
        )}

        {/* Dialogs */}
        <MedFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} onSubmit={handleSubmit} isLoading={isLoading} />
        <MedFormDialog
          open={!!editTarget} onOpenChange={v => { if (!v) setEditTarget(null); }}
          initial={editTarget} onSubmit={handleSubmit} isLoading={isLoading}
        />
      </div>
    </>
  );
}