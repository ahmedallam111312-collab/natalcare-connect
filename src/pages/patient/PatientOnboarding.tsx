import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Calendar, Droplet, Activity, UserPlus, Loader2 } from "lucide-react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const onboardingSchema = z.object({
  age: z.string().min(2, "العمر مطلوب ويجب أن يكون منطقياً"),
  bloodType: z.string().min(1, "فصيلة الدم مطلوبة"),
  lastPeriodDate: z.string().min(1, "تاريخ آخر دورة مطلوب لحساب أسبوع الحمل"),
  previousPregnancies: z.string().min(1, "مطلوب"),
  chronicConditions: z.string().optional(),
  allergies: z.string().optional(),
  assignedDoctorId: z.string().min(1, "يرجى اختيار الطبيب المتابع أو العيادة"),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

export default function PatientOnboarding() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<{id: string, name: string}[]>([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      age: "",
      bloodType: "",
      lastPeriodDate: "",
      previousPregnancies: "0",
      chronicConditions: "",
      allergies: "",
      assignedDoctorId: ""
    }
  });

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "doctor"));
        const snapshot = await getDocs(q);
        const docsList = snapshot.docs.map(d => ({
          id: d.id,
          name: d.data().displayName || "طبيب غير محدد"
        }));
        setDoctors(docsList);
      } catch (err) {
        console.error("Error fetching doctors", err);
      } finally {
        setIsLoadingDoctors(false);
      }
    };
    fetchDoctors();
  }, []);

  const calculateGestationalWeek = (lmpDate: string) => {
    if (!lmpDate) return 0;
    const lmp = new Date(lmpDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lmp.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const calculateRiskLevel = (conditions: string, age: string) => {
    const conds = conditions.toLowerCase();
    if (conds.includes("سكر") || conds.includes("ضغط") || parseInt(age) > 35) {
      return "high";
    }
    return "low";
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    if (!user) return;
    
    try {
      const currentWeek = calculateGestationalWeek(data.lastPeriodDate);
      const risk = calculateRiskLevel(data.chronicConditions || "", data.age);

      await updateDoc(doc(db, "users", user.uid), {
        medicalHistory: {
          age: data.age,
          bloodType: data.bloodType,
          lastPeriodDate: data.lastPeriodDate,
          previousPregnancies: data.previousPregnancies,
          chronicConditions: data.chronicConditions,
          allergies: data.allergies
        },
        assignedDoctorId: data.assignedDoctorId, // ربط صارم بالطبيب!
        week: currentWeek,
        riskLevel: risk,
        profileCompleted: true,
      });

      // Update local state so it doesn't redirect back!
      useAuthStore.getState().setUser({ ...user, profileCompleted: true });

      toast.success("تم حفظ ملفك الطبي وربطك بالعيادة بنجاح!");
      navigate("/patient");
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء حفظ البيانات.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-2xl animate-fade-in space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <ClipboardList className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">مرحباً بكِ في رعاية الأمومة</h1>
          <p className="text-muted-foreground mt-2">لنقم بإعداد ملفك الطبي وربطك بالعيادة لمتابعة حملك خطوة بخطوة.</p>
        </div>

        <Card className="glass-card shadow-xl border-primary/10">
          <CardHeader className="bg-muted/30 border-b">
            <CardTitle className="font-heading text-lg text-primary flex items-center gap-2">
              <UserPlus className="w-5 h-5"/> إعداد الملف الطبي
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4 p-4 rounded-xl border bg-card">
                <h3 className="font-bold text-sm text-primary flex items-center gap-2">العيادة / الطبيب المتابع</h3>
                <div className="space-y-2">
                  <Label>اختاري عيادتك <span className="text-destructive">*</span></Label>
                  <select 
                    {...register("assignedDoctorId")}
                    className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ${errors.assignedDoctorId ? "border-destructive" : "border-input"}`}
                    disabled={isLoadingDoctors}
                  >
                    <option value="" disabled>-- اختاري الطبيب المتابع لحالتك --</option>
                    {doctors.map(doc => (
                      <option key={doc.id} value={doc.id}>عيادة د. {doc.name}</option>
                    ))}
                  </select>
                  {errors.assignedDoctorId && <p className="text-xs text-destructive mt-1">{errors.assignedDoctorId.message}</p>}
                  <p className="text-[10px] text-muted-foreground">سيتم إرسال تقاريرك ومؤشراتك الحيوية مباشرة إلى هذا الطبيب.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>العمر <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="مثال: 28" {...register("age")} className={errors.age ? "border-destructive" : ""} />
                  {errors.age && <p className="text-xs text-destructive">{errors.age.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Droplet className="w-4 h-4 text-destructive" /> فصيلة الدم <span className="text-destructive">*</span></Label>
                  <select 
                    {...register("bloodType")}
                    className={`flex h-10 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ${errors.bloodType ? "border-destructive" : "border-input"}`}
                  >
                    <option value="" disabled>اختر الفصيلة</option>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {errors.bloodType && <p className="text-xs text-destructive">{errors.bloodType.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1"><Calendar className="w-4 h-4 text-primary" /> تاريخ أول يوم لآخر دورة <span className="text-destructive">*</span></Label>
                  <Input type="date" {...register("lastPeriodDate")} className={errors.lastPeriodDate ? "border-destructive" : ""} />
                  {errors.lastPeriodDate ? (
                    <p className="text-xs text-destructive">{errors.lastPeriodDate.message}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">يُستخدم لحساب أسبوع الحمل وموعد الولادة المتوقع</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>عدد الأحمال السابقة <span className="text-destructive">*</span></Label>
                  <Input type="number" min="0" {...register("previousPregnancies")} className={errors.previousPregnancies ? "border-destructive" : ""} />
                  {errors.previousPregnancies && <p className="text-xs text-destructive">{errors.previousPregnancies.message}</p>}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label className="flex items-center gap-1"><Activity className="w-4 h-4 text-warning" /> هل تعانين من أي أمراض مزمنة؟ (اختياري)</Label>
                <Input placeholder="مثال: سكري، ضغط دم، ربو..." {...register("chronicConditions")} />
              </div>

              <div className="space-y-2">
                <Label>هل لديك حساسية تجاه أدوية معينة؟ (اختياري)</Label>
                <Input placeholder="مثال: البنسلين..." {...register("allergies")} />
              </div>

              <Button type="submit" className="w-full mt-6 h-12 text-md" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : null}
                {isSubmitting ? "جاري الحفظ..." : "حفظ وبدء المتابعة"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}