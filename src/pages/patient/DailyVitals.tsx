import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Plus, TrendingUp, AlertTriangle, Loader2, HeartPulse, Droplet, Scale } from "lucide-react";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";

export default function DailyVitals() {
  const { user } = useAuthStore();
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // States
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [sugar, setSugar] = useState("");
  const [weight, setWeight] = useState("");

  // Fetch Vitals
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "vitals"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vitalsData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setHistory(vitalsData);
    });
    return () => unsubscribe();
  }, [user]);

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // تحويل القيم إلى أرقام (أو null إذا كانت فارغة)
    const sys = bpSystolic ? Number(bpSystolic) : null;
    const dia = bpDiastolic ? Number(bpDiastolic) : null;
    const sug = sugar ? Number(sugar) : null;
    const wgt = weight ? Number(weight) : null;

    // التأكد من إدخال قيمة واحدة على الأقل
    if (!sys && !dia && !sug && !wgt) {
      toast.error("يرجى إدخال قيمة واحدة على الأقل (ضغط، سكر، أو وزن)");
      return;
    }

    // إذا أدخلت الانقباضي يجب أن تدخل الانبساطي والعكس
    if ((sys && !dia) || (!sys && dia)) {
      toast.error("يرجى إدخال قيمتي الضغط الانقباضي والانبساطي معاً");
      return;
    }

    setIsLoading(true);

    try {
      let status = "normal";
      let alertMessage = "";

      // فحص القيم الحرجة لإنشاء إنذار للطبيب
      if (sys && sys >= 140 || dia && dia >= 90) {
        status = "critical";
        alertMessage = `ارتفاع في ضغط الدم (${sys}/${dia})`;
      } else if (sug && sug >= 140) {
        status = "critical";
        alertMessage = `ارتفاع في مستوى السكر (${sug} mg/dL)`;
      } else if (sys && sys <= 90 || dia && dia <= 60) {
        status = "warning";
        alertMessage = `انخفاض ملحوظ في ضغط الدم (${sys}/${dia})`;
      }

      // تجهيز البيانات (نرسل فقط الحقول التي تحتوي على قيم)
      const payload: any = {
        date: new Date().toLocaleDateString("ar-EG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
        createdAt: serverTimestamp(),
        status: status
      };

      if (sys && dia) {
        payload.bloodPressureSystolic = sys;
        payload.bloodPressureDiastolic = dia;
      }
      if (sug) payload.bloodSugar = sug;
      if (wgt) payload.weight = wgt;

      // 1. حفظ المؤشرات في ملف المريضة
      await addDoc(collection(db, "users", user.uid, "vitals"), payload);

      // 2. إذا كانت الحالة حرجة أو تحذيرية، نرسل إشعاراً للطبيب فوراً!
      if (status !== "normal") {
        await addDoc(collection(db, "alerts"), {
          patientId: user.uid,
          patientName: user.displayName,
          type: "vitals",
          message: `تنبيه مؤشرات حيوية: ${alertMessage}`,
          severity: status === "critical" ? "high" : "moderate",
          acknowledged: false,
          createdAt: serverTimestamp(),
        });
        toast.warning("تم تسجيل القراءة بنجاح، وتم إبلاغ طبيبك بالمؤشرات لمتابعتك.", { icon: "⚠️", duration: 5000 });
      } else {
        toast.success("تم حفظ المؤشرات بنجاح ✓");
      }

      // تصفير الحقول
      setBpSystolic(""); setBpDiastolic(""); setSugar(""); setWeight("");
    } catch (error) {
      console.error("Error saving vitals:", error);
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsLoading(false);
    }
  };

  // دالة مساعدة لرسم شارة الحالة
  const getStatusBadge = (status: string) => {
    if (status === "critical") return <Badge variant="destructive" className="animate-pulse"><AlertTriangle className="w-3 h-3 ml-1"/> حرج</Badge>;
    if (status === "warning") return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">انتباه</Badge>;
    return <Badge variant="outline" className="text-success border-success/30 bg-success/5">طبيعي</Badge>;
  };

  // تجهيز البيانات للرسم البياني (عكس المصفوفة لتكون من الأقدم للأحدث)
  const chartData = [...history].reverse();

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">المؤشرات الحيوية اليومية</h1>
        <p className="text-muted-foreground text-sm mt-1">سجلي مؤشراتك (يمكنك إدخال قياس واحد أو أكثر)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ================================== */}
        {/* قسم إدخال البيانات */}
        {/* ================================== */}
        <Card className="glass-card lg:col-span-5 h-fit border-primary/20">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2 text-primary">
              <Plus className="w-5 h-5" /> تسجيل مؤشرات جديدة
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* الضغط */}
              <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2"><HeartPulse className="w-4 h-4 text-destructive" /> ضغط الدم</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">الانقباضي (Systolic)</Label>
                    <Input type="number" placeholder="مثال: 120" value={bpSystolic} onChange={(e) => setBpSystolic(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">الانبساطي (Diastolic)</Label>
                    <Input type="number" placeholder="مثال: 80" value={bpDiastolic} onChange={(e) => setBpDiastolic(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* السكر والوزن */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Droplet className="w-4 h-4 text-blue-500" /> سكر الدم</h3>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">القياس (mg/dL)</Label>
                    <Input type="number" placeholder="مثال: 95" value={sugar} onChange={(e) => setSugar(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-500" /> الوزن</h3>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">بالكيلوجرام (kg)</Label>
                    <Input type="number" step="0.1" placeholder="مثال: 68.5" value={weight} onChange={(e) => setWeight(e.target.value)} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-md shadow-md" disabled={isLoading}>
                {isLoading ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Activity className="ml-2 h-5 w-5" />}
                {isLoading ? "جاري الحفظ..." : "حفظ المؤشرات المدخلة"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ================================== */}
        {/* قسم الرسوم البيانية المتعددة */}
        {/* ================================== */}
        <Card className="glass-card lg:col-span-7 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" /> تتبع المؤشرات
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Tabs defaultValue="bp" className="w-full h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="bp">ضغط الدم</TabsTrigger>
                <TabsTrigger value="sugar">سكر الدم</TabsTrigger>
                <TabsTrigger value="weight">الوزن</TabsTrigger>
              </TabsList>
              
              {/* رسم ضغط الدم */}
              <TabsContent value="bp" className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v.split(',')[0]} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" orientation="right" domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: "8px", textAlign: "right", direction: "rtl" }} />
                    <Line type="monotone" connectNulls dataKey="bloodPressureSystolic" stroke="hsl(var(--destructive))" strokeWidth={3} name="انقباضي" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" connectNulls dataKey="bloodPressureDiastolic" stroke="hsl(var(--warning))" strokeWidth={3} name="انبساطي" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              {/* رسم السكر */}
              <TabsContent value="sugar" className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSugar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v.split(',')[0]} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" orientation="right" domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: "8px", textAlign: "right" }} />
                    <Area type="monotone" connectNulls dataKey="bloodSugar" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSugar)" name="مستوى السكر" />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

              {/* رسم الوزن */}
              <TabsContent value="weight" className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v.split(',')[0]} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip contentStyle={{ borderRadius: "8px", textAlign: "right" }} />
                    <Area type="monotone" connectNulls dataKey="weight" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" name="الوزن (كجم)" />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ================================== */}
      {/* جدول السجلات */}
      {/* ================================== */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="font-heading text-lg">سجل القراءات السابقة</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="border-b text-muted-foreground bg-muted/20">
                  <th className="py-3 px-4 font-medium rounded-tr-lg">التاريخ والوقت</th>
                  <th className="py-3 px-4 font-medium">ضغط الدم</th>
                  <th className="py-3 px-4 font-medium">السكر</th>
                  <th className="py-3 px-4 font-medium">الوزن</th>
                  <th className="py-3 px-4 font-medium rounded-tl-lg">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {history.map((v) => (
                  <tr key={v.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4 text-xs font-medium text-muted-foreground">{v.date}</td>
                    <td className="py-3 px-4 font-bold" dir="ltr">
                      {v.bloodPressureSystolic && v.bloodPressureDiastolic ? `${v.bloodPressureSystolic}/${v.bloodPressureDiastolic}` : <span className="text-muted-foreground font-normal">-</span>}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {v.bloodSugar ? `${v.bloodSugar} mg/dL` : <span className="text-muted-foreground font-normal">-</span>}
                    </td>
                    <td className="py-3 px-4 font-bold">
                      {v.weight ? `${v.weight} kg` : <span className="text-muted-foreground font-normal">-</span>}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(v.status || "normal")}
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">لم يتم تسجيل أي مؤشرات بعد.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}