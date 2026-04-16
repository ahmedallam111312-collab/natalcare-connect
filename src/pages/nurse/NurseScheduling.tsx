import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarDays, Plus, Clock } from "lucide-react";
import { collection, onSnapshot, query, where, collectionGroup, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import { toast } from "sonner";

export default function NurseScheduling() {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    patientId: "",
    date: "",
    time: "",
    doctor: "",
    type: "",
    notes: ""
  });

  useEffect(() => {
    // 1. جلب قائمة المرضى لاختيار المريضة عند الحجز ولعرض الاسم
    const qPatients = query(collection(db, "users"), where("role", "==", "patient"));
    const unsubPatients = onSnapshot(qPatients, (snap) => {
      setPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 2. جلب جميع المواعيد من كافة حسابات المرضى
    const qAppts = collectionGroup(db, "appointments");
    const unsubAppts = onSnapshot(qAppts, (snap) => {
      const apptsList = snap.docs.map(doc => {
        // الوصول لمعرف المريض من مسار الوثيقة (users/userId/appointments/docId)
        const userId = doc.ref.parent.parent?.id;
        return {
          id: doc.id,
          userId,
          ...doc.data()
        };
      });
      
      // ترتيب المواعيد زمنياً في الواجهة لتجنب الحاجة لإنشاء فهارس (Indexes) معقدة في Firebase
      apptsList.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || "00:00"}`).getTime();
        const dateB = new Date(`${b.date}T${b.time || "00:00"}`).getTime();
        return dateA - dateB;
      });
      
      setSchedule(apptsList);
    });

    return () => {
      unsubPatients();
      unsubAppts();
    };
  }, []);

  const handleAddAppointment = async () => {
    if (!form.patientId || !form.date || !form.time || !form.doctor || !form.type) {
      return toast.error("يرجى ملء جميع الحقول الإلزامية");
    }

    setLoading(true);
    try {
      // حفظ الموعد في المسار الخاص بالمريضة لكي يظهر في لوحة التحكم الخاصة بها
      await addDoc(collection(db, "users", form.patientId, "appointments"), {
        date: form.date,
        time: form.time,
        doctor: form.doctor,
        type: form.type,
        notes: form.notes,
        createdAt: serverTimestamp()
      });

      toast.success("تم إضافة الموعد بنجاح");
      setIsOpen(false);
      setForm({ patientId: "", date: "", time: "", doctor: "", type: "", notes: "" });
    } catch (error) {
      toast.error("فشل في إضافة الموعد");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">الجدولة والمواعيد</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة مواعيد المرضى ({schedule.length} موعد)</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="ml-2 h-4 w-4" /> موعد جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-heading text-right border-b pb-2">إضافة موعد لمريضة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs">المريضة</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.patientId}
                  onChange={(e) => setForm({ ...form, patientId: e.target.value })}
                >
                  <option value="" disabled>اختر المريضة</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.displayName || "بدون اسم"}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">التاريخ</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">الوقت</Label>
                  <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">اسم الطبيب</Label>
                <Input placeholder="مثال: د. أحمد" value={form.doctor} onChange={(e) => setForm({ ...form, doctor: e.target.value })} className="text-sm" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">نوع الموعد</Label>
                <select
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="" disabled>اختر النوع</option>
                  <option value="متابعة دورية">متابعة دورية</option>
                  <option value="فحص بالموجات فوق الصوتية">فحص بالموجات فوق الصوتية</option>
                  <option value="اختبار سكر الحمل">اختبار سكر الحمل</option>
                  <option value="فحص ضغط الدم">فحص ضغط الدم</option>
                  <option value="استشارة طبية">استشارة طبية</option>
                </select>
              </div>

              <Button className="w-full mt-2" onClick={handleAddAppointment} disabled={loading}>
                {loading ? "جارٍ الحفظ..." : "تأكيد الحجز"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {schedule.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">لا توجد مواعيد مجدولة حالياً.</p>
        ) : (
          schedule.map((s) => {
            // جلب اسم المريضة من قائمة المرضى باستخدام المعرف (userId) الخاص بالموعد
            const patientName = patients.find(p => p.id === s.userId)?.displayName || "مريض غير معروف";

            return (
              <Card key={s.id} className="glass-card">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{patientName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          {s.date} · {s.time}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground hidden sm:block">د. {s.doctor}</span>
                      <Badge variant="outline" className="bg-background">{s.type}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}