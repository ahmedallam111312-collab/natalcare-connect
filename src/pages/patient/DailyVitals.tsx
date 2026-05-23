import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Plus, TrendingUp, AlertTriangle, Loader2, HeartPulse, Droplet, Scale } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { usePatientData } from "@/hooks/usePatientData";
import { patientService } from "@/services/patientService";

// --- Form Validation Schema ---
const vitalsSchema = z.object({
  bloodPressureSystolic: z.union([z.string(), z.number()]).optional(),
  bloodPressureDiastolic: z.union([z.string(), z.number()]).optional(),
  bloodSugar: z.union([z.string(), z.number()]).optional(),
  weight: z.union([z.string(), z.number()]).optional(),
}).refine((data) => {
  // Ensure at least one field is provided
  return data.bloodPressureSystolic || data.bloodPressureDiastolic || data.bloodSugar || data.weight;
}, {
  message: "يرجى إدخال قيمة واحدة على الأقل",
  path: ["root"]
}).refine((data) => {
  // Ensure both systolic and diastolic are provided together if one is provided
  const sys = !!data.bloodPressureSystolic;
  const dia = !!data.bloodPressureDiastolic;
  return sys === dia;
}, {
  message: "يرجى إدخال قيمتي الضغط معاً",
  path: ["bloodPressureSystolic"] // Just point to one
});

type VitalsFormValues = z.infer<typeof vitalsSchema>;

export default function DailyVitals() {
  const { user } = useAuthStore();
  const { vitalsHistory } = usePatientData(user?.uid);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VitalsFormValues>({
    resolver: zodResolver(vitalsSchema),
    defaultValues: {
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      bloodSugar: "",
      weight: ""
    }
  });

  const onSubmit = async (data: VitalsFormValues) => {
    if (!user) return;
    try {
      const payload = {
        bloodPressureSystolic: data.bloodPressureSystolic ? Number(data.bloodPressureSystolic) : undefined,
        bloodPressureDiastolic: data.bloodPressureDiastolic ? Number(data.bloodPressureDiastolic) : undefined,
        bloodSugar: data.bloodSugar ? Number(data.bloodSugar) : undefined,
        weight: data.weight ? Number(data.weight) : undefined,
      };

      const result = await patientService.submitVitals(user.uid, user.displayName || "مريضة", payload);
      
      if (result.status !== "normal") {
        toast.warning(`تم إبلاغ طبيبك: ${result.alertMessage}`, { icon: "⚠️", duration: 5000 });
      } else {
        toast.success("تم حفظ المؤشرات بنجاح ✓");
      }
      reset();
    } catch (error) {
      console.error("Error saving vitals:", error);
      toast.error("حدث خطأ أثناء الحفظ");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "critical") return <Badge variant="destructive" className="animate-pulse"><AlertTriangle className="w-3 h-3 ml-1"/> حرج</Badge>;
    if (status === "warning") return <Badge variant="outline" className="text-warning border-warning/30 bg-warning/5">انتباه</Badge>;
    return <Badge variant="outline" className="text-success border-success/30 bg-success/5">طبيعي</Badge>;
  };

  const chartData = [...vitalsHistory].reverse();

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div>
        <h1 className="text-2xl font-heading font-bold">المؤشرات الحيوية اليومية</h1>
        <p className="text-muted-foreground text-sm mt-1">سجلي مؤشراتك (يمكنك إدخال قياس واحد أو أكثر)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- Data Entry Form --- */}
        <Card className="glass-card lg:col-span-5 h-fit border-primary/20">
          <CardHeader className="bg-primary/5 border-b pb-4">
            <CardTitle className="font-heading text-lg flex items-center gap-2 text-primary">
              <Plus className="w-5 h-5" /> تسجيل مؤشرات جديدة
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {errors.root && <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">{errors.root.message}</div>}

              {/* Blood Pressure */}
              <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                <h3 className="text-sm font-bold flex items-center gap-2"><HeartPulse className="w-4 h-4 text-destructive" /> ضغط الدم</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">الانقباضي (Systolic)</Label>
                    <Input type="number" placeholder="120" {...register("bloodPressureSystolic")} className={errors.bloodPressureSystolic ? "border-destructive" : ""} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">الانبساطي (Diastolic)</Label>
                    <Input type="number" placeholder="80" {...register("bloodPressureDiastolic")} className={errors.bloodPressureDiastolic ? "border-destructive" : ""} />
                  </div>
                </div>
                {(errors.bloodPressureSystolic || errors.bloodPressureDiastolic) && (
                  <p className="text-xs text-destructive mt-1">يرجى إدخال قيمتي الضغط معاً</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Blood Sugar */}
                <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Droplet className="w-4 h-4 text-blue-500" /> سكر الدم</h3>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">القياس (mg/dL)</Label>
                    <Input type="number" placeholder="95" {...register("bloodSugar")} />
                  </div>
                </div>

                {/* Weight */}
                <div className="space-y-3 p-4 rounded-xl border bg-card shadow-sm">
                  <h3 className="text-sm font-bold flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-500" /> الوزن</h3>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">بالكيلوجرام (kg)</Label>
                    <Input type="number" step="0.1" placeholder="68.5" {...register("weight")} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-md shadow-md" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="ml-2 h-5 w-5 animate-spin" /> : <Activity className="ml-2 h-5 w-5" />}
                {isSubmitting ? "جاري الحفظ..." : "حفظ المؤشرات المدخلة"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* --- Charts --- */}
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
              
              <TabsContent value="bp" className="flex-1 min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => typeof v === 'string' ? v.split(',')[0] : ''} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" orientation="right" domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: "8px", textAlign: "right", direction: "rtl" }} />
                    <Line type="monotone" connectNulls dataKey="bloodPressureSystolic" stroke="hsl(var(--destructive))" strokeWidth={3} name="انقباضي" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" connectNulls dataKey="bloodPressureDiastolic" stroke="hsl(var(--warning))" strokeWidth={3} name="انبساطي" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

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
                    <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => typeof v === 'string' ? v.split(',')[0] : ''} />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" orientation="right" domain={['dataMin - 10', 'dataMax + 10']} />
                    <Tooltip contentStyle={{ borderRadius: "8px", textAlign: "right" }} />
                    <Area type="monotone" connectNulls dataKey="bloodSugar" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorSugar)" name="مستوى السكر" />
                  </AreaChart>
                </ResponsiveContainer>
              </TabsContent>

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
                    <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => typeof v === 'string' ? v.split(',')[0] : ''} />
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

      {/* --- History Table --- */}
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
                {vitalsHistory.map((v: any) => (
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
                {vitalsHistory.length === 0 && (
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