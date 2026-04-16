import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Calendar, Droplet, Activity } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export default function PatientOnboarding() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    age: "",
    bloodType: "",
    lastPeriodDate: "",
    previousPregnancies: "0",
    chronicConditions: "",
    allergies: "",
  });

  const calculateGestationalWeek = (lmpDate: string) => {
    if (!lmpDate) return 0;
    const lmp = new Date(lmpDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - lmp.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const calculateRiskLevel = () => {
    const conditions = formData.chronicConditions.toLowerCase();
    if (conditions.includes("سكر") || conditions.includes("ضغط") || parseInt(formData.age) > 35) {
      return "high";
    }
    return "low";
  };

  const handleSaveHistory = async () => {
    if (!formData.age || !formData.lastPeriodDate || !formData.bloodType) {
      return toast.error("يرجى ملء الحقول الأساسية (العمر، فصيلة الدم، وتاريخ آخر دورة)");
    }

    if (!user) return;
    setIsLoading(true);

    try {
      const currentWeek = calculateGestationalWeek(formData.lastPeriodDate);
      const risk = calculateRiskLevel();

      await updateDoc(doc(db, "users", user.uid), {
        medicalHistory: formData,
        week: currentWeek,
        riskLevel: risk,
        profileCompleted: true, // علامة تؤكد أن المريضة أكملت ملفها
      });

      toast.success("تم حفظ ملفك الطبي بنجاح!");
      navigate("/patient");
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ البيانات.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="w-full max-w-2xl animate-fade-in space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-heading font-bold">مرحباً بكِ في رعاية الأمومة</h1>
          <p className="text-muted-foreground mt-2">لنقم بإعداد ملفك الطبي لمساعدة طبيبك في تقديم أفضل رعاية لكِ ولطفلك.</p>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-heading text-lg border-b pb-3">المعلومات الأساسية والتاريخ الطبي</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>العمر</Label>
                <Input type="number" placeholder="مثال: 28" value={formData.age} onChange={(e) => setFormData({...formData, age: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Droplet className="w-4 h-4 text-destructive" /> فصيلة الدم</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.bloodType}
                  onChange={(e) => setFormData({...formData, bloodType: e.target.value})}
                >
                  <option value="" disabled>اختر الفصيلة</option>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Calendar className="w-4 h-4 text-primary" /> تاريخ أول يوم لآخر دورة شهرية</Label>
                <Input type="date" value={formData.lastPeriodDate} onChange={(e) => setFormData({...formData, lastPeriodDate: e.target.value})} />
                <p className="text-[10px] text-muted-foreground">يُستخدم لحساب أسبوع الحمل وموعد الولادة المتوقع</p>
              </div>
              <div className="space-y-2">
                <Label>عدد الأحمال السابقة</Label>
                <Input type="number" min="0" value={formData.previousPregnancies} onChange={(e) => setFormData({...formData, previousPregnancies: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label className="flex items-center gap-1"><Activity className="w-4 h-4 text-warning" /> هل تعانين من أي أمراض مزمنة؟ (اختياري)</Label>
              <Input placeholder="مثال: سكري، ضغط دم، ربو... (اتركيه فارغاً إذا لا يوجد)" value={formData.chronicConditions} onChange={(e) => setFormData({...formData, chronicConditions: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>هل لديك حساسية تجاه أدوية معينة؟ (اختياري)</Label>
              <Input placeholder="مثال: البنسلين... (اتركيه فارغاً إذا لا يوجد)" value={formData.allergies} onChange={(e) => setFormData({...formData, allergies: e.target.value})} />
            </div>

            <Button className="w-full mt-6" size="lg" onClick={handleSaveHistory} disabled={isLoading}>
              {isLoading ? "جاري حفظ الملف..." : "حفظ وبدء المتابعة"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}