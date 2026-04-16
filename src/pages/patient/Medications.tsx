import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, Clock, CheckCircle, Plus, Loader2 } from "lucide-react";
import { collection, query, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db } from "@/services/firebase";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "sonner";

export default function Medications() {
  const { user } = useAuthStore();
  const [medications, setMedications] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // حالة نموذج إضافة الدواء
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    frequency: "مرة يومياً"
  });

  // جلب الأدوية من قاعدة البيانات
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "users", user.uid, "medications"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // دالة تحديد لون شريط الالتزام
  const getAdherenceColor = (adherence: number) => {
    if (adherence >= 90) return "text-success";
    if (adherence >= 70) return "text-warning";
    return "text-destructive";
  };

  // 1. إضافة دواء جديد إلى Firebase
  const handleAddMedication = async () => {
    if (!formData.name || !formData.dosage) {
      return toast.error("يرجى إدخال اسم الدواء والجرعة");
    }
    if (!user) return;

    setIsLoading(true);
    try {
      await addDoc(collection(db, "users", user.uid, "medications"), {
        name: formData.name,
        dosage: formData.dosage,
        frequency: formData.frequency,
        reminders: true, // التذكيرات مفعلة افتراضياً
        adherence: 100, // نبدأ بنسبة التزام 100%
        takenDates: [], // مصفوفة لتخزين التواريخ التي تم أخذ الدواء فيها
        createdAt: serverTimestamp()
      });
      toast.success("تمت إضافة الدواء بنجاح ✓");
      setIsAddOpen(false);
      setFormData({ name: "", dosage: "", frequency: "مرة يومياً" });
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء إضافة الدواء");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. تفعيل/إلغاء التذكيرات
  const toggleReminder = async (medId: string, currentStatus: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid, "medications", medId), { reminders: !currentStatus });
    } catch (error) {
      toast.error("فشل في تحديث إعدادات التذكير.");
    }
  };

  // 3. تسجيل أخذ الجرعة اليومية
  const handleMarkAsTaken = async (med: any) => {
    if (!user) return;
    
    // نحصل على تاريخ اليوم بصيغة (YYYY-MM-DD)
    const today = new Date().toLocaleDateString("en-CA"); 

    try {
      await updateDoc(doc(db, "users", user.uid, "medications", med.id), {
        takenDates: arrayUnion(today), // إضافة تاريخ اليوم للمصفوفة
        adherence: Math.min(100, (med.adherence || 0) + 5) // زيادة نسبة الالتزام للتحفيز
      });
      toast.success(`تم تسجيل أخذ جرعة ${med.name} بنجاح!`);
    } catch (error) {
      console.error(error);
      toast.error("حدث خطأ أثناء تسجيل الجرعة");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* الرأس */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">الأدوية والمكملات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة الأدوية وتتبع مدى التزامك بالجرعات</p>
        </div>
        
        {/* زر ونافذة الإضافة */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" /> إضافة دواء
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-heading text-right border-b pb-2">إضافة دواء جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الدواء / المكمل</Label>
                <Input 
                  placeholder="مثال: حمض الفوليك (Folic Acid)" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">الجرعة</Label>
                <Input 
                  placeholder="مثال: 5mg أو حبة واحدة" 
                  value={formData.dosage} 
                  onChange={(e) => setFormData({...formData, dosage: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">معدل التكرار</Label>
                <Select value={formData.frequency} onValueChange={(v) => setFormData({...formData, frequency: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر التكرار" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="مرة يومياً">مرة يومياً</SelectItem>
                    <SelectItem value="مرتين يومياً">مرتين يومياً</SelectItem>
                    <SelectItem value="عند اللزوم">عند اللزوم</SelectItem>
                    <SelectItem value="مرة أسبوعياً">مرة أسبوعياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full mt-2" onClick={handleAddMedication} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Pill className="h-4 w-4 ml-2" />}
                {isLoading ? "جاري الإضافة..." : "حفظ الدواء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* قائمة الأدوية */}
      {medications.length === 0 ? (
        <div className="text-center p-12 text-muted-foreground border-2 border-dashed border-border rounded-xl">
          <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p>لا توجد أدوية نشطة حالياً. اضغطي على "إضافة دواء" للبدء.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {medications.map((med) => {
            // التحقق مما إذا كانت المريضة قد أخذت الدواء اليوم
            const today = new Date().toLocaleDateString("en-CA");
            const isTakenToday = med.takenDates && med.takenDates.includes(today);

            return (
              <Card key={med.id} className="glass-card">
                <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
                  <div className="flex items-start justify-between">
                    <CardTitle className="font-heading text-base flex items-center gap-2">
                      <Pill className="w-4 h-4 text-primary" /> {med.name}
                    </CardTitle>
                    <Badge variant="secondary" className="bg-background">{med.frequency}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">الجرعة المحددة</span>
                    <span className="font-medium bg-muted px-2 py-0.5 rounded-md" dir="ltr">{med.dosage}</span>
                  </div>

                  {/* شريط نسبة الالتزام */}
                  <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-background">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">نسبة التزامك الكلية</span>
                      <span className={`font-bold ${getAdherenceColor(med.adherence || 0)}`}>
                        {med.adherence || 0}%
                      </span>
                    </div>
                    <Progress value={med.adherence || 0} className="h-2 rotate-180 bg-muted" />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" /> تفعيل التنبيهات
                    </div>
                    <Switch checked={med.reminders || false} onCheckedChange={() => toggleReminder(med.id, med.reminders)} />
                  </div>

                  {/* زر تسجيل الجرعة اليومية */}
                  <Button 
                    variant={isTakenToday ? "secondary" : "default"} 
                    className={`w-full ${isTakenToday ? "opacity-70 cursor-not-allowed" : "shadow-md hover:shadow-lg transition-all"}`}
                    disabled={isTakenToday}
                    onClick={() => handleMarkAsTaken(med)}
                  >
                    <CheckCircle className={`ml-2 h-4 w-4 ${isTakenToday ? "text-success" : ""}`} /> 
                    {isTakenToday ? "تم أخذ جرعة اليوم ✓" : 'تسجيل الدواء كـ "مأخوذ" الآن'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}