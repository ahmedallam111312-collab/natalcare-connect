import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Activity, Baby, FileText, AlertTriangle, Loader2, Pill, ArrowRight, User } from "lucide-react";
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  
  const [patient, setPatient] = useState<any>(null);
  const [fmcReports, setFmcReports] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchPatientData = async () => {
      try {
        const docRef = doc(db, "users", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPatient({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (error) {
        console.error("Error fetching patient:", error);
      }
    };

    fetchPatientData();

    const fmcQ = query(collection(db, "users", id, "fmcReports"), orderBy("createdAt", "desc"));
    const unsubFmc = onSnapshot(fmcQ, (snap) => setFmcReports(snap.docs.map(d => d.data())));

    const labsQ = query(collection(db, "users", id, "labs"), orderBy("createdAt", "desc"));
    const unsubLabs = onSnapshot(labsQ, (snap) => setLabs(snap.docs.map(d => d.data())));

    const alertsQ = query(collection(db, "alerts"), where("patientId", "==", id));
    const unsubAlerts = onSnapshot(alertsQ, (snap) => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAlerts(arr);
    });

    const medsQ = query(collection(db, "users", id, "medications"));
    const unsubMeds = onSnapshot(medsQ, (snap) => setMedications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    setTimeout(() => setLoading(false), 500);

    return () => { unsubFmc(); unsubLabs(); unsubAlerts(); unsubMeds(); };
  }, [id]);

  if (loading || !patient) {
    return (
      <div className="flex flex-col justify-center items-center h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">جاري تحميل الملف الطبي الشامل...</p>
      </div>
    );
  }

  // 1. فصل السونار عن باقي التحاليل
  const ultrasounds = labs.filter(l => l.category === "موجات فوق صوتية (سونار)");
  const laboratoryTests = labs.filter(l => l.category !== "موجات فوق صوتية (سونار)");

  // 2. تجميع التحاليل المخبرية حسب التاريخ
  const groupedLabsByDate = laboratoryTests.reduce((acc: any, lab: any) => {
    const date = lab.date || "تاريخ غير معروف";
    if (!acc[date]) acc[date] = [];
    acc[date].push(lab);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild className="rounded-full">
          <Link to="/doctor/patients">
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
            <User className="w-8 h-8 text-primary" />
            الملف الطبي: {patient.displayName || "مريضة بدون اسم"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {patient.week ? `في الأسبوع ${patient.week} من الحمل` : "بيانات الحمل غير مكتملة"}
          </p>
        </div>
      </div>

      <Card className="glass-card shadow-sm border-transparent bg-white dark:bg-card">
        <CardContent className="p-6">
          <Tabs defaultValue="history" className="w-full" dir="rtl">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6 mb-8 bg-muted/50 h-auto p-1.5 rounded-xl gap-1">
              <TabsTrigger value="history" className="text-sm py-2.5 rounded-lg data-[state=active]:shadow-sm">التاريخ الطبي</TabsTrigger>
              <TabsTrigger value="symptoms" className="text-sm py-2.5 rounded-lg data-[state=active]:shadow-sm">الأعراض</TabsTrigger>
              <TabsTrigger value="labs" className="text-sm py-2.5 rounded-lg data-[state=active]:shadow-sm">التحاليل</TabsTrigger>
              <TabsTrigger value="ultrasound" className="text-sm py-2.5 rounded-lg data-[state=active]:shadow-sm">السونار</TabsTrigger>
              <TabsTrigger value="fmc" className="text-sm py-2.5 rounded-lg data-[state=active]:shadow-sm">حركة الجنين</TabsTrigger>
              <TabsTrigger value="meds" className="text-sm py-2.5 rounded-lg data-[state=active]:shadow-sm">الأدوية</TabsTrigger>
            </TabsList>

            {/* 1. التاريخ الطبي */}
            <TabsContent value="history" className="space-y-6 mt-4 animate-in fade-in-50">
              {patient.medicalHistory ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm p-6 rounded-2xl border border-border/50 bg-muted/10 shadow-inner">
                  <div className="space-y-1"><span className="text-muted-foreground block text-xs uppercase tracking-wider">العمر</span><span className="font-semibold text-lg">{patient.medicalHistory.age} سنة</span></div>
                  <div className="space-y-1"><span className="text-muted-foreground block text-xs uppercase tracking-wider">فصيلة الدم</span><span className="font-semibold text-lg text-primary" dir="ltr">{patient.medicalHistory.bloodType}</span></div>
                  <div className="space-y-1"><span className="text-muted-foreground block text-xs uppercase tracking-wider">أسبوع الحمل</span><span className="font-semibold text-lg">{patient.week || "-"}</span></div>
                  <div className="space-y-1"><span className="text-muted-foreground block text-xs uppercase tracking-wider">أحمال سابقة</span><span className="font-semibold text-lg">{patient.medicalHistory.previousPregnancies}</span></div>
                  <div className="col-span-1 md:col-span-2 space-y-1"><span className="text-muted-foreground block text-xs uppercase tracking-wider">تاريخ آخر دورة شهرية</span><span className="font-semibold text-lg">{patient.medicalHistory.lastPeriodDate}</span></div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 border-t border-border/50 pt-6 mt-2 space-y-1">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">أمراض مزمنة</span>
                    <span className="font-semibold text-lg text-destructive">{patient.medicalHistory.chronicConditions || "لا يوجد أمراض مزمنة مسجلة"}</span>
                  </div>
                  <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-1">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">حساسية أدوية</span>
                    <span className="font-semibold text-lg text-warning">{patient.medicalHistory.allergies || "لا توجد حساسية مسجلة"}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed">
                  <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground">البيانات غير مكتملة</h3>
                  <p className="text-muted-foreground mt-2">لم تقم المريضة بتهيئة ملفها الطبي بعد.</p>
                </div>
              )}
            </TabsContent>

            {/* 2. الأعراض */}
            <TabsContent value="symptoms" className="space-y-4 mt-4 animate-in fade-in-50">
              {alerts.length === 0 ? (
                <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed">
                  <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أعراض مسجلة للمريضة حتى الآن.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {alerts.map((a) => (
                    <div key={a.id} className="p-4 rounded-xl border border-border/50 bg-background flex items-start gap-4 hover:border-primary/30 transition-colors shadow-sm">
                      <div className={`p-2 rounded-full mt-0.5 ${a.severity === 'high' ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                        <AlertTriangle className={`w-5 h-5 ${a.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-base">{a.message}</p>
                        <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-2">
                          <span className="bg-muted px-2 py-0.5 rounded-md text-xs">{a.time}</span>
                          <span>{new Date(a.createdAt?.toDate()).toLocaleDateString("ar-EG")}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 3. التحاليل المخبرية */}
            <TabsContent value="labs" className="space-y-8 mt-4 animate-in fade-in-50">
              {laboratoryTests.length === 0 && (
                 <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed">
                  <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد تحاليل مخبرية مسجلة.</p>
                </div>
              )}

              {Object.keys(groupedLabsByDate).length > 0 && (
                <div className="space-y-6">
                  {Object.entries(groupedLabsByDate).map(([date, tests]: [string, any[]]) => (
                    <Card key={date} className="overflow-hidden shadow-sm border-border/50">
                      <CardHeader className="bg-muted/20 py-4 border-b px-6">
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" /> باقة تحاليل بتاريخ: {date}
                          </span>
                          <Badge variant="secondary" className="font-normal">{tests.length} تحاليل</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-right">
                            <thead className="bg-muted/10 text-muted-foreground text-xs uppercase tracking-wider">
                              <tr>
                                <th className="py-3 px-6 font-medium">اسم التحليل</th>
                                <th className="py-3 px-6 font-medium">النتيجة</th>
                                <th className="py-3 px-6 font-medium">المعدل الطبيعي</th>
                                <th className="py-3 px-6 font-medium">الحالة</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {tests.map((lab, idx) => (
                                <tr key={idx} className="hover:bg-muted/10 transition-colors">
                                  <td className="py-3.5 px-6 font-medium text-primary">{lab.testName || "تحليل عام"}</td>
                                  <td className="py-3.5 px-6 font-bold text-base" dir="ltr">
                                    {lab.value} <span className="text-muted-foreground text-xs font-normal ml-1">{lab.unit}</span>
                                  </td>
                                  <td className="py-3.5 px-6 text-muted-foreground" dir="ltr">{lab.referenceRange || "-"}</td>
                                  <td className="py-3.5 px-6">
                                    <Badge variant={lab.status === 'abnormal' ? 'destructive' : 'outline'} className={lab.status === 'normal' ? 'text-success border-success/30 bg-success/5' : 'bg-destructive/5'}>
                                      {lab.status === 'abnormal' ? 'غير طبيعي' : 'طبيعي'}
                                    </Badge>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 3.5. تقارير السونار */}
            <TabsContent value="ultrasound" className="space-y-8 mt-4 animate-in fade-in-50">
              {ultrasounds.length === 0 && (
                 <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed">
                  <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد تقارير سونار مسجلة.</p>
                </div>
              )}

              {ultrasounds.length > 0 && (
                <div className="grid gap-6">
                  {ultrasounds.map((lab, i) => (
                    <div key={i} className="p-6 rounded-2xl border border-border/50 bg-background space-y-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center border-b border-border/50 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg text-primary"><Activity className="w-5 h-5"/></div>
                          <h3 className="font-heading font-bold text-lg">فحص السونار الروتيني</h3>
                        </div>
                        <Badge variant="secondary">{lab.date}</Badge>
                      </div>
                      
                      {lab.details && (
                        <div className="pt-2 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/20 p-5 rounded-xl">
                            {lab.details.ga && <div className="space-y-1"><span className="text-muted-foreground text-xs font-medium">عمر الجنين (GA)</span><p className="font-bold text-lg">{lab.details.ga}</p></div>}
                            {lab.details.fhr && <div className="space-y-1"><span className="text-muted-foreground text-xs font-medium">النبض (FHR)</span><p className="font-bold text-lg">{lab.details.fhr}</p></div>}
                            {lab.details.efw && <div className="space-y-1"><span className="text-muted-foreground text-xs font-medium">الوزن (EFW)</span><p className="font-bold text-lg">{lab.details.efw}</p></div>}
                            {lab.details.afi && <div className="space-y-1"><span className="text-muted-foreground text-xs font-medium">السائل (AFI)</span><p className="font-bold text-lg">{lab.details.afi}</p></div>}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-primary/5 p-5 rounded-xl border border-primary/10">
                            {lab.details.bpd && <div className="space-y-1"><span className="text-primary/70 text-xs font-medium">BPD</span><p className="font-bold">{lab.details.bpd}</p></div>}
                            {lab.details.hc && <div className="space-y-1"><span className="text-primary/70 text-xs font-medium">HC</span><p className="font-bold">{lab.details.hc}</p></div>}
                            {lab.details.ac && <div className="space-y-1"><span className="text-primary/70 text-xs font-medium">AC</span><p className="font-bold">{lab.details.ac}</p></div>}
                            {lab.details.fl && <div className="space-y-1"><span className="text-primary/70 text-xs font-medium">FL</span><p className="font-bold">{lab.details.fl}</p></div>}
                            
                            {lab.details.flBpd && <div className="space-y-1 mt-2"><span className="text-primary/70 text-xs font-medium">FL/BPD Ratio</span><p className="font-bold">{lab.details.flBpd}</p></div>}
                            {lab.details.ci && <div className="space-y-1 mt-2"><span className="text-primary/70 text-xs font-medium">Cephalic Index</span><p className="font-bold">{lab.details.ci}</p></div>}
                            {lab.details.hcAc && <div className="space-y-1 mt-2"><span className="text-primary/70 text-xs font-medium">HC/AC Ratio</span><p className="font-bold">{lab.details.hcAc}</p></div>}
                            {lab.details.flAc && <div className="space-y-1 mt-2"><span className="text-primary/70 text-xs font-medium">FL/AC Ratio</span><p className="font-bold">{lab.details.flAc}</p></div>}
                          </div>

                          {lab.details.notes && (
                            <div className="mt-4 p-4 bg-muted/40 rounded-xl border border-border/50">
                              <p className="font-bold text-sm text-foreground mb-1">ملاحظات الطبيب المتخصص:</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">{lab.details.notes}</p>
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
            <TabsContent value="fmc" className="space-y-4 mt-4 animate-in fade-in-50">
              {fmcReports.length === 0 ? (
                <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed">
                  <Baby className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد جلسات تتبع لحركة الجنين.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {fmcReports.map((f, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border/50 bg-background flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${f.goalMet ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                          <Baby className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base">سُجلت {f.kicks} ركلات</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{f.date}</p>
                        </div>
                      </div>
                      <Badge variant={f.goalMet ? "outline" : "secondary"} className={`px-3 py-1 ${f.goalMet ? "text-success border-success/30 bg-success/5" : ""}`}>
                        {f.goalMet ? "معدل طبيعي" : "يحتاج متابعة"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 5. الأدوية */}
            <TabsContent value="meds" className="space-y-4 mt-4 animate-in fade-in-50">
              {medications.length === 0 ? (
                <div className="text-center p-12 bg-muted/20 rounded-2xl border border-dashed">
                  <Pill className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أدوية مسجلة.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {medications.map((med) => (
                    <div key={med.id} className="p-5 rounded-xl border border-border/50 bg-background flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <Pill className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-base text-foreground">{med.name}</p>
                          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="bg-muted px-2 py-0.5 rounded text-xs">{med.dosage}</span>
                            <span>{med.frequency}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-center bg-muted/20 p-2 rounded-lg min-w-[80px]">
                        <p className="text-xs text-muted-foreground mb-1.5 font-medium">نسبة الالتزام</p>
                        <Badge variant="outline" className={`w-full justify-center py-1 ${med.adherence >= 90 ? "text-success border-success/30 bg-success/10" : med.adherence >= 70 ? "text-warning border-warning/30 bg-warning/10" : "text-destructive border-destructive/30 bg-destructive/10"}`}>
                          {med.adherence || 0}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
