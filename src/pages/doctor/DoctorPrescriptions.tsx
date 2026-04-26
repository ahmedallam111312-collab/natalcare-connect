import { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/services/firebase";
import {
  Pill,
  User,
  Plus,
  Trash2,
  Printer,
  Save,
  Stethoscope,
  Sparkles,
  ClipboardList,
  ChevronDown,
  Baby,
  HeartPulse,
  Leaf,
  Droplets,
  ShieldCheck,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  name: string;
  phone?: string;
  age?: number;
}

interface Medication {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  notes: string;
}

// ─── Prescription Templates ──────────────────────────────────────────────────

const TEMPLATES: {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  medications: Omit<Medication, "id">[];
}[] = [
  {
    id: "first_trimester",
    label: "روتين الثلث الأول",
    icon: <Baby size={14} />,
    color: "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100",
    medications: [
      { drugName: "حمض الفوليك", dosage: "5 مجم", frequency: "مرة يومياً", notes: "تؤخذ مع الطعام" },
      { drugName: "فيتامين د", dosage: "1000 وحدة دولية", frequency: "مرة يومياً", notes: "" },
      { drugName: "أوميغا 3", dosage: "1000 مجم", frequency: "مرة يومياً", notes: "مع وجبة الغداء" },
    ],
  },
  {
    id: "anemia",
    label: "علاج الأنيميا",
    icon: <Droplets size={14} />,
    color: "bg-red-50 border-red-200 text-red-700 hover:bg-red-100",
    medications: [
      { drugName: "كبريتات الحديد", dosage: "325 مجم", frequency: "مرتين يومياً", notes: "على معدة فارغة" },
      { drugName: "فيتامين سي", dosage: "500 مجم", frequency: "مرتين يومياً", notes: "مع الحديد لتحسين الامتصاص" },
      { drugName: "حمض الفوليك", dosage: "5 مجم", frequency: "مرة يومياً", notes: "" },
    ],
  },
  {
    id: "second_trimester",
    label: "روتين الثلث الثاني",
    icon: <HeartPulse size={14} />,
    color: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
    medications: [
      { drugName: "كالسيوم كربونات", dosage: "500 مجم", frequency: "مرتين يومياً", notes: "مع الطعام" },
      { drugName: "حديد + حمض فوليك", dosage: "جرعة واحدة", frequency: "مرة يومياً", notes: "" },
      { drugName: "فيتامين د3", dosage: "2000 وحدة دولية", frequency: "مرة يومياً", notes: "" },
    ],
  },
  {
    id: "nausea",
    label: "علاج الغثيان",
    icon: <Leaf size={14} />,
    color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
    medications: [
      { drugName: "ميتوكلوبراميد", dosage: "10 مجم", frequency: "ثلاث مرات يومياً", notes: "قبل الوجبات بـ 30 دقيقة" },
      { drugName: "بيريدوكسين (B6)", dosage: "25 مجم", frequency: "ثلاث مرات يومياً", notes: "" },
    ],
  },
  {
    id: "third_trimester",
    label: "روتين الثلث الثالث",
    icon: <ShieldCheck size={14} />,
    color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
    medications: [
      { drugName: "أسبرين منخفض الجرعة", dosage: "75 مجم", frequency: "مرة يومياً", notes: "ليلاً" },
      { drugName: "كالسيوم كربونات", dosage: "1000 مجم", frequency: "مرتين يومياً", notes: "مع الطعام" },
      { drugName: "حديد + حمض فوليك", dosage: "جرعة واحدة", frequency: "مرة يومياً", notes: "" },
      { drugName: "فيتامين د3", dosage: "2000 وحدة دولية", frequency: "مرة يومياً", notes: "" },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substr(2, 9);

const formatDate = (date: Date) =>
  date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DoctorPrescriptions() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Form state
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch patients from Firebase
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "patient"));
        const snapshot = await getDocs(q);
        const data: Patient[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            // قمنا بإصلاح المشكلة هنا بالبحث عن displayName
            name: d.displayName || d.name || "مريضة بدون اسم",
            phone: d.phone || "",
          } as Patient;
        });
        setPatients(data);
      } catch (err) {
        console.error("Error fetching patients:", err);
      }
    };
    fetchPatients();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPatientDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const applyTemplate = (templateId: string) => {
    const template = TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const newMeds: Medication[] = template.medications.map((m) => ({
      ...m,
      id: generateId(),
    }));
    setMedications(newMeds);
  };

  const addMedication = () => {
    if (!drugName.trim()) return;
    setMedications((prev) => [
      ...prev,
      { id: generateId(), drugName, dosage, frequency, notes },
    ]);
    setDrugName("");
    setDosage("");
    setFrequency("");
    setNotes("");
  };

  const removeMedication = (id: string) =>
    setMedications((prev) => prev.filter((m) => m.id !== id));

  const handlePrint = () => window.print();

  const handleSave = async () => {
    if (!selectedPatient || medications.length === 0) return;
    setSaving(true);
    try {
      const medsRef = collection(db, "users", selectedPatient.id, "medications");
      for (const med of medications) {
        await addDoc(medsRef, {
          name: med.drugName, // تم التغيير إلى name ليتطابق مع صفحة المريضة
          dosage: med.dosage,
          frequency: med.frequency,
          notes: med.notes,
          prescribedAt: serverTimestamp(),
          prescribedBy: "د. أحمد شعبان",
          reminders: true, // تفعيل التذكيرات للمريضة
          adherence: 100, // نسبة الالتزام الافتراضية
          takenDates: [], // مصفوفة الأيام التي تم أخذ الدواء فيها
        });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving medications:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ── Print styles injected globally ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Cairo:wght@300;400;500;600;700&display=swap');

        @media print {
          * { visibility: hidden !important; }
          #rx-preview, #rx-preview * { visibility: visible !important; }
          #rx-preview {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 2rem !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }

        .rx-page {
          font-family: 'Cairo', sans-serif;
          direction: rtl;
        }

        .rx-heading {
          font-family: 'Amiri', serif;
        }

        .prescription-paper {
          background: 
            radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.03) 0%, transparent 50%),
            radial-gradient(circle at 90% 80%, rgba(6, 182, 212, 0.03) 0%, transparent 50%),
            #ffffff;
        }

        .watermark-symbol {
          font-family: 'Amiri', serif;
          color: rgba(16, 185, 129, 0.06);
          font-size: 12rem;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          pointer-events: none;
          user-select: none;
          font-weight: 700;
        }

        .template-btn {
          transition: all 0.18s ease;
          border-width: 1.5px;
        }

        .template-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        }

        .med-row {
          animation: slideIn 0.2s ease;
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-family: 'Cairo', sans-serif;
          background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
          text-align: right;
          color: #1e293b;
        }

        .input-field:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        .input-field::placeholder {
          color: #94a3b8;
        }
      `}</style>

      <div className="rx-page min-h-screen bg-slate-50" dir="rtl">
        {/* ── Top Header ── */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
              <Stethoscope size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 rx-heading leading-tight">
                نظام الروشتة الإلكترونية الذكية
              </h1>
              <p className="text-xs text-slate-400">عيادة الدكتور شعبان – رعاية ما قبل الولادة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Printer size={15} />
              طباعة
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedPatient || medications.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                saveSuccess
                  ? "bg-emerald-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <Save size={15} />
              {saving ? "جاري الحفظ..." : saveSuccess ? "✓ تم الحفظ!" : "حفظ وإرسال"}
            </button>
          </div>
        </header>

        {/* ── Body ── */}
        <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">

          {/* ══════════════════════ RIGHT SIDE – Controls ══════════════════════ */}
          <div className="lg:w-96 xl:w-[420px] flex-shrink-0 space-y-4">

            {/* Patient Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-emerald-600" />
                <h2 className="font-semibold text-slate-700 text-sm">اختيار المريضة</h2>
              </div>
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setPatientDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 border-2 border-slate-200 rounded-xl text-sm bg-white hover:border-emerald-400 transition-colors"
                >
                  <span className={selectedPatient ? "text-slate-800 font-medium" : "text-slate-400"}>
                    {selectedPatient ? selectedPatient.name : "ابحث عن مريضة..."}
                  </span>
                  <ChevronDown size={16} className={`text-slate-400 transition-transform ${patientDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {patientDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg z-50 max-h-52 overflow-y-auto">
                    {patients.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400 text-center">لا توجد مرضى</div>
                    ) : (
                      patients.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedPatient(p); setPatientDropdownOpen(false); }}
                          className={`w-full text-right px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex items-center gap-2 ${
                            selectedPatient?.id === p.id ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-700"
                          }`}
                        >
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs flex-shrink-0">
                            {(p.name || "م").charAt(0)}
                          </div>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            {p.phone && <div className="text-xs text-slate-400">{p.phone}</div>}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Templates */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={16} className="text-amber-500" />
                <h2 className="font-semibold text-slate-700 text-sm">روشتات جاهزة سريعة</h2>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t.id)}
                    className={`template-btn flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium text-right ${t.color}`}
                  >
                    <span className="opacity-70">{t.icon}</span>
                    {t.label}
                    <span className="mr-auto text-xs opacity-50">{TEMPLATES.find(x => x.id === t.id)?.medications.length} أدوية</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Manual Add */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <ClipboardList size={16} className="text-sky-600" />
                <h2 className="font-semibold text-slate-700 text-sm">إضافة دواء يدوياً</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">اسم الدواء *</label>
                  <input
                    className="input-field"
                    placeholder="مثال: باراسيتامول"
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">الجرعة</label>
                    <input
                      className="input-field"
                      placeholder="500 مجم"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1 font-medium">التكرار</label>
                    <input
                      className="input-field"
                      placeholder="مرتين يومياً"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1 font-medium">ملاحظات</label>
                  <input
                    className="input-field"
                    placeholder="مع الطعام، قبل النوم..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <button
                  onClick={addMedication}
                  disabled={!drugName.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                  إضافة الدواء
                </button>
              </div>
            </div>

            {/* Medication List Summary */}
            {medications.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-violet-600" />
                    <h2 className="font-semibold text-slate-700 text-sm">قائمة الأدوية</h2>
                  </div>
                  <span className="bg-violet-100 text-violet-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {medications.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {medications.map((med) => (
                    <div
                      key={med.id}
                      className="med-row flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-100"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{med.drugName}</p>
                        <p className="text-xs text-slate-400">{med.dosage} · {med.frequency}</p>
                      </div>
                      <button
                        onClick={() => removeMedication(med.id)}
                        className="mr-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════ LEFT SIDE – Live Preview ══════════════════════ */}
          <div className="flex-1 min-w-0">
            <div
              id="rx-preview"
              className="prescription-paper rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative"
              style={{ minHeight: "600px" }}
            >
              {/* Watermark */}
              <div className="watermark-symbol select-none pointer-events-none">℞</div>

              {/* Header Band */}
              <div
                className="relative z-10 px-8 pt-8 pb-6"
                style={{
                  background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)",
                }}
              >
                {/* Decorative line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1"
                  style={{
                    background: "linear-gradient(90deg, #fbbf24, #f59e0b, #d97706)",
                  }}
                />

                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                        <Stethoscope size={16} className="text-white" />
                      </div>
                      <span className="text-emerald-200 text-xs font-medium tracking-wide">عيادة رعاية الحمل والولادة</span>
                    </div>
                    <h1 className="rx-heading text-3xl font-bold text-white leading-tight">
                      عيادة الدكتور شعبان
                    </h1>
                    <p className="text-emerald-300 text-sm mt-1">د. أحمد شعبان – استشاري أمراض النساء والتوليد</p>
                    <div className="flex items-center gap-4 mt-3">
                      <span className="text-emerald-200 text-xs">📍 القاهرة، مصر</span>
                      <span className="text-emerald-200 text-xs">📞 01xxxxxxxxx</span>
                    </div>
                  </div>
                  <div className="text-left text-emerald-200 text-xs space-y-1 text-right">
                    <div className="bg-white/10 rounded-xl px-4 py-3 border border-white/20">
                      <div className="text-emerald-300 text-xs mb-1">تاريخ الروشتة</div>
                      <div className="text-white font-bold">{formatDate(new Date())}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient Info Strip */}
              <div className="relative z-10 bg-amber-50 border-b border-amber-100 px-8 py-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center">
                    {selectedPatient ? (
                      <span className="text-amber-700 font-bold text-sm">{(selectedPatient.name || "م").charAt(0)}</span>
                    ) : (
                      <User size={18} className="text-amber-400" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs text-amber-600 font-medium">اسم المريضة</div>
                    <div className="text-slate-800 font-bold text-sm">
                      {selectedPatient ? selectedPatient.name : (
                        <span className="text-slate-300 italic font-normal">لم يتم الاختيار بعد</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-px h-8 bg-amber-200" />
                <div>
                  <div className="text-xs text-amber-600 font-medium">رقم الملف</div>
                  <div className="text-slate-600 text-sm font-mono">
                    {selectedPatient ? `#${selectedPatient.id.slice(-6).toUpperCase()}` : "—"}
                  </div>
                </div>
                <div className="mr-auto">
                  <span
                    className="text-xs px-3 py-1 rounded-full font-bold"
                    style={{
                      background: "linear-gradient(135deg, #065f46, #047857)",
                      color: "white",
                    }}
                  >
                    ℞ روشتة طبية
                  </span>
                </div>
              </div>

              {/* Prescription Body */}
              <div className="relative z-10 px-8 py-6">
                {medications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                      style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)" }}
                    >
                      <Pill size={36} className="text-emerald-300" />
                    </div>
                    <p className="text-slate-400 text-base font-medium">لم تتم إضافة أدوية بعد</p>
                    <p className="text-slate-300 text-sm mt-1">اختر قالباً جاهزاً أو أضف دواءً يدوياً</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {medications.map((med, idx) => (
                      <div
                        key={med.id}
                        className="flex gap-4 items-start p-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50/60 to-transparent"
                      >
                        {/* Index badge */}
                        <div
                          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ background: "linear-gradient(135deg, #065f46, #059669)" }}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-base rx-heading">{med.drugName}</span>
                            {med.dosage && (
                              <span
                                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: "#ecfdf5", color: "#065f46" }}
                              >
                                {med.dosage}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {med.frequency && (
                              <span className="flex items-center gap-1 text-sm text-slate-600">
                                <span className="text-amber-500">🕐</span>
                                {med.frequency}
                              </span>
                            )}
                            {med.notes && (
                              <span className="flex items-center gap-1 text-sm text-slate-500 italic">
                                <span>📝</span>
                                {med.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div
                className="relative z-10 mt-4 px-8 py-5 border-t border-slate-100"
                style={{ background: "linear-gradient(to bottom, transparent, #f8fafc)" }}
              >
                <div className="flex items-end justify-between">
                  <div className="text-center">
                    <div
                      className="w-32 h-0.5 mb-1"
                      style={{ background: "linear-gradient(90deg, transparent, #94a3b8, transparent)" }}
                    />
                    <p className="text-xs text-slate-500">توقيع الطبيب</p>
                    <p className="text-sm font-bold text-slate-700 rx-heading mt-0.5">د. أحمد شعبان</p>
                  </div>
                  <div className="text-center text-xs text-slate-400">
                    <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center mx-auto mb-1">
                      <span className="text-slate-300 text-xs">خاتم</span>
                    </div>
                    <span>ختم العيادة</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-400">صالحة لمدة</p>
                    <p className="text-sm font-bold text-slate-600">٣٠ يوماً</p>
                    <p className="text-xs text-slate-400 mt-1">من تاريخ الإصدار</p>
                  </div>
                </div>

                {/* Bottom brand strip */}
                <div
                  className="mt-4 rounded-lg px-4 py-2 flex items-center justify-between"
                  style={{ background: "linear-gradient(135deg, #064e3b, #065f46)" }}
                >
                  <span className="text-emerald-300 text-xs">هذه الروشتة صادرة بشكل إلكتروني وتحمل صلاحية قانونية كاملة</span>
                  <span className="text-emerald-400 text-xs font-mono">
                    RX-{new Date().getFullYear()}-{Math.random().toString(36).substr(2, 6).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}