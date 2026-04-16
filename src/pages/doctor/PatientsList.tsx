import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, ClipboardList, Activity, Baby, FileText, AlertTriangle, Loader2, Pill } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

// ==========================================
// مكون تغيير مستوى الخطر تفاعلياً (Interactive Risk Selector)
// ==========================================
function RiskSelector({ patientId, currentRisk }: { patientId: string, currentRisk: string }) {
  const [loading, setLoading] = useState(false);

  const handleRiskChange = async (newRisk: string) => {
    if (newRisk === currentRisk) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "users", patientId), { riskLevel: newRisk });
      toast.success("تم تحديث مستوى خطر المريضة بنجاح");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء تحديث مستوى الخطر");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeClass = (r: string) => {
    if (r === "high") return "text-destructive border-destructive/30 bg-destructive/10";
    if (r === "moderate") return "text-warning border-warning/30 bg-warning/10";
    return "text-success border-success/30 bg-success/10";
  };

  const getLabel = (r: string) => {
    if (r === "high") return "عالي";
    if (r === "moderate") return "متوسط";
    return "منخفض";
  };

  return (
    <Select value={currentRisk || "low"} onValueChange={handleRiskChange} disabled={loading}>
      <SelectTrigger className={`h-8 px-3 text-xs w-[100px] font-bold border ${getBadgeClass(currentRisk || "low")}`}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : <SelectValue>{getLabel(currentRisk || "low")}</SelectValue>}
      </SelectTrigger>
      <SelectContent dir="rtl">
        <SelectItem value="low" className="text-success font-bold focus:bg-success/10 cursor-pointer">منخفض</SelectItem>
        <SelectItem value="moderate" className="text-warning font-bold focus:bg-warning/10 cursor-pointer">متوسط</SelectItem>
        <SelectItem value="high" className="text-destructive font-bold focus:bg-destructive/10 cursor-pointer">عالي</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ==========================================
// مكون الملف الطبي الشامل (Patient Record)
// ==========================================
function PatientRecordDetails({ patient }: { patient: any }) {
  const [fmcReports, setFmcReports] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;

    const fmcQ = query(collection(db, "users", patient.id, "fmcReports"), orderBy("createdAt", "desc"));
    const unsubFmc = onSnapshot(fmcQ, (snap) => setFmcReports(snap.docs.map(d => d.data())));

    const labsQ = query(collection(db, "users", patient.id, "labs"), orderBy("createdAt", "desc"));
    const unsubLabs = onSnapshot(labsQ, (snap) => setLabs(snap.docs.map(d => d.data())));

    const alertsQ = query(collection(db, "alerts"), where("patientId", "==", patient.id));
    const unsubAlerts = onSnapshot(alertsQ, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAlerts(arr);
    });

    const medsQ = query(collection(db, "users", patient.id, "medications"));
    const unsubMeds = onSnapshot(medsQ, (snap) => setMedications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    setTimeout(() => setLoading(false), 500);

    return () => { unsubFmc(); unsubLabs(); unsubAlerts(); unsubMeds(); };
  }, [patient.id]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // 1. فصل السونار عن باقي التحاليل
  const ultrasounds = labs.filter(l => l.category === "موجات فوق صوتية (سونار)");
  const laboratoryTests = labs.filter(l => l.category !== "موجات فوق صوتية (سونار)");

  // 2. تجميع التحاليل المخبرية حسب اسم التحليل (لتتبع التقدم)
  const groupedLabs = laboratoryTests.reduce((acc: any, lab: any) => {
    const name = lab.testName || "تحليل عام";
    if (!acc[name]) acc[name] = [];
    acc[name].push(lab);
    return acc;
  }, {});

  return (
    <Tabs defaultValue="history" className="w-full mt-4" dir="rtl">
      <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 mb-4 bg-muted/50 h-auto p-1">
        <TabsTrigger value="history" className="text-xs py-2">التاريخ الطبي</TabsTrigger>
        <TabsTrigger value="symptoms" className="text-xs py-2">الأعراض</TabsTrigger>
        <TabsTrigger value="labs" className="text-xs py-2">التحاليل والسونار</TabsTrigger>
        <TabsTrigger value="fmc" className="text-xs py-2">حركة الجنين</TabsTrigger>
        <TabsTrigger value="meds" className="text-xs py-2">الأدوية</TabsTrigger>
      </TabsList>

      {/* 1. التاريخ الطبي */}
      <TabsContent value="history" className="space-y-4">
        {patient.medicalHistory ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-6 gap-x-4 text-sm p-4 rounded-xl border bg-muted/20">
            <div><span className="text-muted-foreground block mb-1">العمر</span><span className="font-medium">{patient.medicalHistory.age} سنة</span></div>
            <div><span className="text-muted-foreground block mb-1">فصيلة الدم</span><span className="font-medium" dir="ltr">{patient.medicalHistory.bloodType}</span></div>
            <div><span className="text-muted-foreground block mb-1">أسبوع الحمل</span><span className="font-medium">{patient.week || "-"}</span></div>
            <div><span className="text-muted-foreground block mb-1">أحمال سابقة</span><span className="font-medium">{patient.medicalHistory.previousPregnancies}</span></div>
            <div className="col-span-2"><span className="text-muted-foreground block mb-1">تاريخ آخر دورة شهرية</span><span className="font-medium">{patient.medicalHistory.lastPeriodDate}</span></div>
            <div className="col-span-3 border-t pt-4"><span className="text-muted-foreground block mb-1">أمراض مزمنة</span><span className="font-medium text-destructive">{patient.medicalHistory.chronicConditions || "لا يوجد"}</span></div>
            <div className="col-span-3"><span className="text-muted-foreground block mb-1">حساسية أدوية</span><span className="font-medium text-warning">{patient.medicalHistory.allergies || "لا يوجد"}</span></div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">لم تقم المريضة بتهيئة ملفها الطبي بعد.</p>
        )}
      </TabsContent>

      {/* 2. الأعراض */}
      <TabsContent value="symptoms" className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {alerts.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد أعراض مسجلة.</p> : null}
        {alerts.map((a) => (
          <div key={a.id} className="p-3 rounded-lg border bg-background flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${a.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
            <div>
              <p className="font-medium text-sm">{a.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{a.time} · {new Date(a.createdAt?.toDate()).toLocaleDateString("ar-EG")}</p>
            </div>
          </div>
        ))}
      </TabsContent>

      {/* 3. السونار والتحاليل المجمعة */}
      <TabsContent value="labs" className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 pb-4">
        {labs.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد تقارير سونار أو تحاليل مسجلة.</p>
        )}

        {/* قسم التحاليل المخبرية (في جداول لتتبع التقدم) */}
        {Object.keys(groupedLabs).length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-primary flex items-center gap-2 border-b pb-2">
              <Activity className="w-5 h-5" /> التحاليل المخبرية (تتبع التقدم)
            </h3>
            {Object.entries(groupedLabs).map(([testName, testHistory]: [string, any[]]) => (
              <Card key={testName} className="overflow-hidden shadow-sm border-border">
                <CardHeader className="bg-muted/30 py-3 border-b px-4">
                  <CardTitle className="text-sm font-bold flex items-center justify-between">
                    <span>{testName}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">{testHistory.length} قراءات مسجلة</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-muted/10 text-muted-foreground text-xs">
                      <tr>
                        <th className="py-2 px-4 font-medium">التاريخ</th>
                        <th className="py-2 px-4 font-medium">النتيجة</th>
                        <th className="py-2 px-4 font-medium">المعدل الطبيعي</th>
                        <th className="py-2 px-4 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {testHistory.map((lab, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-2.5 px-4 text-xs font-medium">{lab.date}</td>
                          <td className="py-2.5 px-4 font-bold" dir="ltr">
                            {lab.value} <span className="text-muted-foreground text-[10px] font-normal ml-1">{lab.unit}</span>
                          </td>
                          <td className="py-2.5 px-4 text-xs text-muted-foreground" dir="ltr">{lab.referenceRange || "-"}</td>
                          <td className="py-2.5 px-4">
                            <Badge variant={lab.status === 'abnormal' ? 'destructive' : 'outline'} className={lab.status === 'normal' ? 'text-success border-success/30 bg-success/5' : 'bg-destructive/5'}>
                              {lab.status === 'abnormal' ? 'غير طبيعي' : 'طبيعي'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* قسم تقارير السونار */}
        {ultrasounds.length > 0 && (
          <div className="space-y-4 pt-4">
            <h3 className="font-bold text-primary flex items-center gap-2 border-b pb-2">
              <FileText className="w-5 h-5" /> تقارير السونار (Ultrasound)
            </h3>
            {ultrasounds.map((lab, i) => (
              <div key={i} className="p-4 rounded-xl border bg-background space-y-2 shadow-sm">
                <div className="flex justify-between items-start border-b pb-2">
                  <h3 className="font-heading font-bold text-sm">فحص السونار الروتيني</h3>
                  <span className="text-xs text-muted-foreground">{lab.date}</span>
                </div>
                
                {lab.details && (
                  <div className="pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/30 p-3 rounded-lg text-xs mb-3">
                      {lab.details.ga && <div><span className="text-muted-foreground block mb-0.5">عمر الجنين (GA)</span><span className="font-medium">{lab.details.ga}</span></div>}
                      {lab.details.fhr && <div><span className="text-muted-foreground block mb-0.5">النبض (FHR)</span><span className="font-medium">{lab.details.fhr}</span></div>}
                      {lab.details.efw && <div><span className="text-muted-foreground block mb-0.5">الوزن (EFW)</span><span className="font-medium">{lab.details.efw}</span></div>}
                      {lab.details.afi && <div><span className="text-muted-foreground block mb-0.5">السائل (AFI)</span><span className="font-medium">{lab.details.afi}</span></div>}
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-primary/5 p-3 rounded-lg text-xs border border-primary/10">
                      {lab.details.bpd && <div><span className="text-muted-foreground block mb-0.5">BPD</span><span className="font-medium">{lab.details.bpd}</span></div>}
                      {lab.details.hc && <div><span className="text-muted-foreground block mb-0.5">HC</span><span className="font-medium">{lab.details.hc}</span></div>}
                      {lab.details.ac && <div><span className="text-muted-foreground block mb-0.5">AC</span><span className="font-medium">{lab.details.ac}</span></div>}
                      {lab.details.fl && <div><span className="text-muted-foreground block mb-0.5">FL</span><span className="font-medium">{lab.details.fl}</span></div>}
                      
                      {lab.details.flBpd && <div className="mt-2"><span className="text-muted-foreground block mb-0.5">FL/BPD</span><span className="font-medium">{lab.details.flBpd}</span></div>}
                      {lab.details.ci && <div className="mt-2"><span className="text-muted-foreground block mb-0.5">Cephalic Index</span><span className="font-medium">{lab.details.ci}</span></div>}
                      {lab.details.hcAc && <div className="mt-2"><span className="text-muted-foreground block mb-0.5">HC/AC</span><span className="font-medium">{lab.details.hcAc}</span></div>}
                      {lab.details.flAc && <div className="mt-2"><span className="text-muted-foreground block mb-0.5">FL/AC</span><span className="font-medium">{lab.details.flAc}</span></div>}
                    </div>

                    {lab.details.notes && (
                      <div className="mt-3 text-xs bg-muted/50 p-2 rounded-lg">
                        <span className="font-bold text-muted-foreground">ملاحظات:</span> {lab.details.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* 4. حركة الجنين */}
      <TabsContent value="fmc" className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {fmcReports.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد جلسات تتبع لحركة الجنين.</p> : null}
        {fmcReports.map((f, i) => (
          <div key={i} className="p-3 rounded-lg border bg-background flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${f.goalMet ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-sm">سُجلت {f.kicks} ركلات</p>
                <p className="text-xs text-muted-foreground mt-0.5">{f.date}</p>
              </div>
            </div>
            <Badge variant={f.goalMet ? "outline" : "secondary"} className={f.goalMet ? "text-success border-success/30" : ""}>
              {f.goalMet ? "طبيعي" : "يحتاج متابعة"}
            </Badge>
          </div>
        ))}
      </TabsContent>

      {/* 5. الأدوية */}
      <TabsContent value="meds" className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {medications.length === 0 ? <p className="text-center text-muted-foreground py-8">لا توجد أدوية مسجلة.</p> : null}
        {medications.map((med) => (
          <div key={med.id} className="p-3 rounded-lg border bg-background flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Pill className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm">{med.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{med.dosage} · {med.frequency}</p>
              </div>
            </div>
            <div className="text-center">
               <p className="text-[10px] text-muted-foreground mb-1">الالتزام</p>
               <Badge variant="outline" className={med.adherence >= 90 ? "text-success border-success/30 bg-success/5" : med.adherence >= 70 ? "text-warning border-warning/30 bg-warning/5" : "text-destructive border-destructive/30 bg-destructive/5"}>
                 {med.adherence || 0}%
               </Badge>
            </div>
          </div>
        ))}
      </TabsContent>
    </Tabs>
  );
}

// ==========================================
// الصفحة الرئيسية للقائمة
// ==========================================
export default function PatientsList() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const filtered = patients.filter((p) =>
    p.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">المرضى</h1>
          <p className="text-muted-foreground text-sm mt-1">عرض جميع المرضى المسجلين بالنظام ({patients.length})</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="ابحث عن مريض..." className="pr-10" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> قائمة المرضى
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-3 px-3 font-medium">الاسم</th>
                  <th className="py-3 px-3 font-medium">أسبوع الحمل</th>
                  <th className="py-3 px-3 font-medium">مستوى الخطر</th>
                  <th className="py-3 px-3 font-medium">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-muted-foreground">لا يوجد مرضى مطابقين.</td>
                  </tr>
                ) : (
                  filtered.map((p) => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-3 font-medium">{p.displayName || "بدون اسم"}</td>
                      <td className="py-3 px-3">{p.week ? `الأسبوع ${p.week}` : "غير محدد"}</td>
                      <td className="py-3 px-3">
                        <RiskSelector patientId={p.id} currentRisk={p.riskLevel} />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary">
                                <ClipboardList className="w-3.5 h-3.5 ml-1" /> الملف الطبي
                              </Button>
                            </DialogTrigger>
                            <DialogContent dir="rtl" className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                              <DialogHeader className="shrink-0 border-b pb-3">
                                <DialogTitle className="font-heading text-xl text-right flex items-center gap-2">
                                  <Activity className="w-5 h-5 text-primary" />
                                  الملف الطبي: {p.displayName}
                                </DialogTitle>
                              </DialogHeader>
                              <div className="flex-1 overflow-hidden">
                                <PatientRecordDetails patient={p} />
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}